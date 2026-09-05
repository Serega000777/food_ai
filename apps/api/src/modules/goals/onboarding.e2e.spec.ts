import { createHmac } from "node:crypto";

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../../app.module";

/** Exercises the full onboarding vertical slice end-to-end against real Postgres:
 * Telegram login -> PATCH profile -> POST goals (server-computed plan) -> GET dashboard
 * (empty state, since MealEntry doesn't exist until Phase 3). */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";

function signInitData(userId: number): string {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    user: JSON.stringify({ id: userId, first_name: "Onboarding", language_code: "ru" }),
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

async function loginAsNewUser(app: INestApplication) {
  const res = await request(app.getHttpServer())
    .post("/v1/auth/telegram")
    .send({ initData: signInitData(nextTelegramUserId()) })
    .expect(200);
  return res.body as { accessToken: string };
}

describe("Onboarding (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    if (!BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN must be set to run this suite");
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("v1", { exclude: ["health"] });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("rejects a goal before the profile is complete", async () => {
    const { accessToken } = await loginAsNewUser(app);

    await request(app.getHttpServer())
      .post("/v1/goals")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ type: "LOSE", currentWeightKg: 82, activityLevel: "sedentary" })
      .expect(400);
  });

  it("completes onboarding: profile -> goal -> dashboard reflects the server-computed target", async () => {
    const { accessToken } = await loginAsNewUser(app);
    const auth = { Authorization: `Bearer ${accessToken}` };

    await request(app.getHttpServer())
      .patch("/v1/me/profile")
      .set(auth)
      .send({ birthDate: "1996-01-01", sex: "male", heightCm: 178 })
      .expect(200);

    const goalRes = await request(app.getHttpServer())
      .post("/v1/goals")
      .set(auth)
      .send({
        type: "LOSE",
        currentWeightKg: 82,
        targetWeightKg: 75,
        activityLevel: "sedentary",
        paceKgPerWeek: 0.5,
      })
      .expect(201);

    expect(goalRes.body.calorieTarget).toBeGreaterThan(1200);
    expect(goalRes.body.source).toBe("INITIAL_FORMULA");

    const dashboardRes = await request(app.getHttpServer())
      .get("/v1/dashboard")
      .set(auth)
      .expect(200);

    expect(dashboardRes.body.target.calories).toBe(goalRes.body.calorieTarget);
    expect(dashboardRes.body.consumed).toEqual({
      calories: 0,
      proteinG: 0,
      fatG: 0,
      carbsG: 0,
    });
    expect(dashboardRes.body.remaining).toEqual(dashboardRes.body.target);
    expect(dashboardRes.body.meals).toEqual([]);
  });

  it("returns 404 from the dashboard before onboarding sets a goal", async () => {
    const { accessToken } = await loginAsNewUser(app);
    await request(app.getHttpServer())
      .get("/v1/dashboard")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(404);
  });
});
