import { createHmac } from "node:crypto";

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../../app.module";
import { AllExceptionsFilter } from "../../common/all-exceptions.filter";

/** Exercises Phase 6 end-to-end against real Postgres (requires `pnpm db:seed`):
 * recent/frequent meals + repeat flow (master prompt §19), weight upsert-by-day and
 * progress averages (§20). Analytics events (§28) are fire-and-forget writes with no
 * response-visible effect, so they're not asserted on here directly. */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";

function signInitData(userId: number): string {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    user: JSON.stringify({ id: userId, first_name: "Phase6", language_code: "ru" }),
  });
  const dataCheckString = [...params.entries()]
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
  params.set("hash", createHmac("sha256", secretKey).update(dataCheckString).digest("hex"));
  return params.toString();
}

let idCounter = 0;
const runPrefix = Math.floor(Math.random() * 1_000_000);
function nextTelegramUserId(): number {
  idCounter += 1;
  return runPrefix * 1_000_000 + idCounter;
}

describe("Phase 6: recent meals, weight, progress (e2e)", () => {
  let app: INestApplication;

  async function onboardedUser(currentWeightKg = 80, timezone = "Europe/Moscow") {
    const res = await request(app.getHttpServer())
      .post("/v1/auth/telegram")
      .send({ initData: signInitData(nextTelegramUserId()), timezone })
      .expect(200);
    const auth = { Authorization: `Bearer ${res.body.accessToken}` };

    await request(app.getHttpServer())
      .patch("/v1/me/profile")
      .set(auth)
      .send({ birthDate: "1996-01-01", sex: "male", heightCm: 178 })
      .expect(200);

    await request(app.getHttpServer())
      .post("/v1/goals")
      .set(auth)
      .send({ type: "MAINTAIN", currentWeightKg, activityLevel: "sedentary" })
      .expect(201);

    return auth;
  }

  async function findFoodId(auth: Record<string, string>, name: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .get("/v1/foods/search")
      .query({ q: name })
      .set(auth)
      .expect(200);
    if (res.body.length === 0) {
      throw new Error(`Seeded food "${name}" not found — did \`pnpm db:seed\` run?`);
    }
    return res.body[0].id as string;
  }

  beforeAll(async () => {
    if (!BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN must be set to run this suite");
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("v1", { exclude: ["health"] });
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("starts with no recent meals for a fresh user", async () => {
    const auth = await onboardedUser();
    const res = await request(app.getHttpServer()).get("/v1/recent-meals").set(auth).expect(200);
    expect(res.body).toEqual([]);
  });

  it("groups repeated food combos, and repeat creates a new entry through the normal path", async () => {
    const auth = await onboardedUser();
    const chickenId = await findFoodId(auth, "Куриная грудка");
    const riceId = await findFoodId(auth, "Рис варёный");

    // Same combo (chicken) twice at different gram amounts -> one recent-meal group.
    await request(app.getHttpServer())
      .post("/v1/meals")
      .set(auth)
      .send({ mealType: "LUNCH", items: [{ foodId: chickenId, grams: 150 }] })
      .expect(201);
    const secondChicken = await request(app.getHttpServer())
      .post("/v1/meals")
      .set(auth)
      .send({ mealType: "DINNER", items: [{ foodId: chickenId, grams: 120 }] })
      .expect(201);

    // A different combo -> its own group.
    await request(app.getHttpServer())
      .post("/v1/meals")
      .set(auth)
      .send({ mealType: "BREAKFAST", items: [{ foodId: riceId, grams: 100 }] })
      .expect(201);

    const recentRes = await request(app.getHttpServer())
      .get("/v1/recent-meals")
      .set(auth)
      .expect(200);

    expect(recentRes.body).toHaveLength(2);
    const chickenGroup = recentRes.body.find((m: { id: string }) => m.id === secondChicken.body.id);
    expect(chickenGroup).toMatchObject({ timesEaten: 2, mealType: "DINNER" });
    expect(chickenGroup.items[0].grams).toBe(120); // the most recent occurrence's template

    const repeatRes = await request(app.getHttpServer())
      .post("/v1/meals/repeat")
      .set(auth)
      .send({ sourceMealId: chickenGroup.id })
      .expect(201);
    expect(repeatRes.body.items[0].foodId).toBe(chickenId);

    // The group's occurrence count grows now that the repeat created a third chicken meal.
    const recentAfterRepeat = await request(app.getHttpServer())
      .get("/v1/recent-meals")
      .set(auth)
      .expect(200);
    const chickenGroupAfter = recentAfterRepeat.body.find(
      (m: { items: Array<{ foodId: string }> }) => m.items[0].foodId === chickenId,
    );
    expect(chickenGroupAfter.timesEaten).toBe(3);
  });

  it("404s repeating another user's meal (IDOR)", async () => {
    const owner = await onboardedUser();
    const foodId = await findFoodId(owner, "Яблоко");
    const meal = await request(app.getHttpServer())
      .post("/v1/meals")
      .set(owner)
      .send({ mealType: "SNACK", items: [{ foodId, grams: 100 }] })
      .expect(201);

    const attacker = await onboardedUser();
    await request(app.getHttpServer())
      .post("/v1/meals/repeat")
      .set(attacker)
      .send({ sourceMealId: meal.body.id })
      .expect(404);
  });

  it("POST /v1/weights upserts today's entry instead of creating a second one", async () => {
    const auth = await onboardedUser(80);

    // Onboarding itself already logged 80kg for today (ADR: weight_logs table pre-dates
    // Phase 6) — logging again today should update that row, not add a second one.
    await request(app.getHttpServer())
      .post("/v1/weights")
      .set(auth)
      .send({ weightKg: 79.5 })
      .expect(201);

    const progressRes = await request(app.getHttpServer())
      .get("/v1/progress")
      .query({ range: "7" })
      .set(auth)
      .expect(200);

    expect(progressRes.body.weightLogs).toHaveLength(1);
    expect(progressRes.body.weightTrend).toEqual({
      startWeightKg: 79.5,
      currentWeightKg: 79.5,
      changeKg: 0,
    });

    // Logging again the same day updates in place, still one row.
    await request(app.getHttpServer())
      .post("/v1/weights")
      .set(auth)
      .send({ weightKg: 79 })
      .expect(201);

    const secondProgressRes = await request(app.getHttpServer())
      .get("/v1/progress")
      .query({ range: "7" })
      .set(auth)
      .expect(200);
    expect(secondProgressRes.body.weightLogs).toHaveLength(1);
    expect(secondProgressRes.body.weightTrend.currentWeightKg).toBe(79);
  });

  it("averages calories over days actually logged, not the full range", async () => {
    const auth = await onboardedUser();
    const chickenId = await findFoodId(auth, "Куриная грудка");

    // Two meals today (100 kcal/100g @ 200g each isn't exact, so just read the food's
    // own snapshot back rather than hand-computing kcal) — the point is dividing by
    // daysLogged=1, not the full 30-day range.
    const first = await request(app.getHttpServer())
      .post("/v1/meals")
      .set(auth)
      .send({ mealType: "LUNCH", items: [{ foodId: chickenId, grams: 150 }] })
      .expect(201);
    const second = await request(app.getHttpServer())
      .post("/v1/meals")
      .set(auth)
      .send({ mealType: "DINNER", items: [{ foodId: chickenId, grams: 150 }] })
      .expect(201);
    const expectedDailyTotal = first.body.totalCalories + second.body.totalCalories;

    const progressRes = await request(app.getHttpServer())
      .get("/v1/progress")
      .query({ range: "30" })
      .set(auth)
      .expect(200);

    expect(progressRes.body.daysLogged).toBe(1);
    expect(progressRes.body.daysInRange).toBe(30);
    expect(progressRes.body.averages.calories).toBeCloseTo(expectedDailyTotal);
  });
});
