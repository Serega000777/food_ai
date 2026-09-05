import { createHmac } from "node:crypto";

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../../app.module";
import { AllExceptionsFilter } from "../../common/all-exceptions.filter";

/** Exercises the full manual-logging vertical slice end-to-end against real Postgres
 * (requires `pnpm db:seed` to have run — the seeded "Куриная грудка" food is used
 * throughout). Covers AT-005 through AT-009 and AT-015 at the HTTP/integration level;
 * the pure arithmetic (AT-005/006) is also unit-tested directly in packages/nutrition. */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";

function signInitData(userId: number): string {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    user: JSON.stringify({ id: userId, first_name: "Meals", language_code: "ru" }),
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

describe("Meals + Diary + Dashboard (e2e)", () => {
  let app: INestApplication;

  async function onboardedUser(timezone = "Europe/Moscow") {
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
      .send({ type: "MAINTAIN", currentWeightKg: 80, activityLevel: "sedentary" })
      .expect(201);

    return auth;
  }

  async function findSeededFoodId(auth: Record<string, string>): Promise<string> {
    const res = await request(app.getHttpServer())
      .get("/v1/foods/search")
      .query({ q: "Куриная грудка" })
      .set(auth)
      .expect(200);
    if (res.body.length === 0) {
      throw new Error('Seeded food "Куриная грудка" not found — did `pnpm db:seed` run?');
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

  it("AT-005/006: creates a meal whose totals match grams x per-100g exactly", async () => {
    const auth = await onboardedUser();
    const foodId = await findSeededFoodId(auth);

    const res = await request(app.getHttpServer())
      .post("/v1/meals")
      .set(auth)
      .send({ mealType: "LUNCH", items: [{ foodId, grams: 100 }] })
      .expect(201);

    // Куриная грудка: 165 kcal/100g — 100g must be exactly 165, not an AI guess.
    expect(res.body.totalCalories).toBe(165);
    expect(res.body.items).toHaveLength(1);
  });

  it("rejects an unknown food id instead of silently accepting client-supplied nutrition", async () => {
    const auth = await onboardedUser();
    await request(app.getHttpServer())
      .post("/v1/meals")
      .set(auth)
      .send({
        mealType: "SNACK",
        items: [{ foodId: "00000000-0000-0000-0000-000000000000", grams: 50 }],
      })
      .expect(400);
  });

  it("AT-015: retrying a create with the same Idempotency-Key returns the same meal, not a duplicate", async () => {
    const auth = await onboardedUser();
    const foodId = await findSeededFoodId(auth);
    const key = `test-${nextTelegramUserId()}`;

    const first = await request(app.getHttpServer())
      .post("/v1/meals")
      .set({ ...auth, "Idempotency-Key": key })
      .send({ mealType: "BREAKFAST", items: [{ foodId, grams: 120 }] })
      .expect(201);

    const retry = await request(app.getHttpServer())
      .post("/v1/meals")
      .set({ ...auth, "Idempotency-Key": key })
      .send({ mealType: "BREAKFAST", items: [{ foodId, grams: 120 }] })
      .expect(201);

    expect(retry.body.id).toBe(first.body.id);

    const diary = await request(app.getHttpServer()).get("/v1/diary").set(auth).expect(200);
    expect(diary.body.meals.filter((m: { id: string }) => m.id === first.body.id)).toHaveLength(1);
  });

  it("AT-007/008: editing then deleting a meal updates the dashboard's consumed total", async () => {
    const auth = await onboardedUser();
    const foodId = await findSeededFoodId(auth);

    const created = await request(app.getHttpServer())
      .post("/v1/meals")
      .set(auth)
      .send({ mealType: "DINNER", items: [{ foodId, grams: 100 }] })
      .expect(201);

    const afterCreate = await request(app.getHttpServer())
      .get("/v1/dashboard")
      .set(auth)
      .expect(200);
    expect(afterCreate.body.consumed.calories).toBe(165);

    await request(app.getHttpServer())
      .patch(`/v1/meals/${created.body.id}`)
      .set(auth)
      .send({ items: [{ foodId, grams: 200 }] })
      .expect(200);

    const afterEdit = await request(app.getHttpServer()).get("/v1/dashboard").set(auth).expect(200);
    expect(afterEdit.body.consumed.calories).toBe(330); // AT-007

    await request(app.getHttpServer()).delete(`/v1/meals/${created.body.id}`).set(auth).expect(204);

    const afterDelete = await request(app.getHttpServer())
      .get("/v1/dashboard")
      .set(auth)
      .expect(200);
    expect(afterDelete.body.consumed.calories).toBe(0); // AT-008
  });

  it("prevents one user from editing or deleting another user's meal (IDOR)", async () => {
    const owner = await onboardedUser();
    const intruder = await onboardedUser();
    const foodId = await findSeededFoodId(owner);

    const created = await request(app.getHttpServer())
      .post("/v1/meals")
      .set(owner)
      .send({ mealType: "SNACK", items: [{ foodId, grams: 50 }] })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/v1/meals/${created.body.id}`)
      .set(intruder)
      .send({ mealType: "LUNCH" })
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/v1/meals/${created.body.id}`)
      .set(intruder)
      .expect(404);
  });

  it("AT-009: a meal just after local midnight lands in the new day, not the previous one", async () => {
    const auth = await onboardedUser("Europe/Moscow");
    const foodId = await findSeededFoodId(auth);

    // 00:10 Moscow time is 21:10 UTC the previous calendar date.
    const localMidnightPlus10 = new Date();
    localMidnightPlus10.setUTCHours(21, 10, 0, 0);
    const utcDateOfThatInstant = localMidnightPlus10.toISOString().slice(0, 10);
    const nextLocalDate = new Date(`${utcDateOfThatInstant}T00:00:00Z`);
    nextLocalDate.setUTCDate(nextLocalDate.getUTCDate() + 1);
    const localDiaryDate = nextLocalDate.toISOString().slice(0, 10);

    await request(app.getHttpServer())
      .post("/v1/meals")
      .set(auth)
      .send({
        mealType: "SNACK",
        eatenAt: localMidnightPlus10.toISOString(),
        items: [{ foodId, grams: 100 }],
      })
      .expect(201);

    const nextDayDiary = await request(app.getHttpServer())
      .get("/v1/diary")
      .query({ date: localDiaryDate })
      .set(auth)
      .expect(200);
    expect(nextDayDiary.body.meals).toHaveLength(1);

    const prevDayDiary = await request(app.getHttpServer())
      .get("/v1/diary")
      .query({ date: utcDateOfThatInstant })
      .set(auth)
      .expect(200);
    expect(prevDayDiary.body.meals).toHaveLength(0);
  });
});
