import { createHmac } from "node:crypto";

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import sharp from "sharp";
import request from "supertest";

import { AppModule } from "../../app.module";
import { AllExceptionsFilter } from "../../common/all-exceptions.filter";

/**
 * Exercises the full photo pipeline end-to-end against real Postgres, Redis, and
 * MinIO: upload -> queued -> worker analyzes with the mock VisionProvider -> matching
 * -> confirm. Requires `pnpm db:seed` (matching runs against the seeded catalog) and
 * a running redis/minio (see README "Быстрый старт").
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const TERMINAL_STATUSES = new Set([
  "NEEDS_CLARIFICATION",
  "READY_TO_CONFIRM",
  "ANALYSIS_FAILED",
  "MATCH_FAILED",
]);

function signInitData(userId: number): string {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    user: JSON.stringify({ id: userId, first_name: "Photo", language_code: "ru" }),
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

/** A real, tiny, sharp-decodable JPEG — a fixed magic-byte prefix alone isn't enough,
 * since the upload path actually decodes it (rotate/thumbnail/metadata). Varying the
 * background color gives different tests different (still deterministic) mock
 * scenarios without hand-computing hashes. */
function makeTestPhoto(color: { r: number; g: number; b: number }): Promise<Buffer> {
  return sharp({ create: { width: 20, height: 20, channels: 3, background: color } })
    .jpeg()
    .toBuffer();
}

describe("Meal photo analysis (e2e)", () => {
  let app: INestApplication;

  async function onboardedUser() {
    const res = await request(app.getHttpServer())
      .post("/v1/auth/telegram")
      .send({ initData: signInitData(nextTelegramUserId()), timezone: "Europe/Moscow" })
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

  async function uploadPhoto(auth: Record<string, string>, photo: Buffer) {
    const res = await request(app.getHttpServer())
      .post("/v1/meals/photo")
      .set(auth)
      .attach("photo", photo, "meal.jpg")
      .expect(201);
    return res.body as { id: string; status: string };
  }

  async function pollUntilSettled(
    auth: Record<string, string>,
    analysisId: string,
    timeoutMs = 15_000,
  ) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const res = await request(app.getHttpServer())
        .get(`/v1/meal-analyses/${analysisId}`)
        .set(auth)
        .expect(200);
      if (TERMINAL_STATUSES.has(res.body.status)) return res.body;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    throw new Error(`Analysis ${analysisId} did not settle within ${timeoutMs}ms`);
  }

  beforeAll(async () => {
    if (!BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN must be set to run this suite");
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("v1", { exclude: ["health"] });
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  }, 30_000);

  afterAll(async () => {
    await app.close();
  });

  it("rejects a non-image upload", async () => {
    const auth = await onboardedUser();
    await request(app.getHttpServer())
      .post("/v1/meals/photo")
      .set(auth)
      .attach("photo", Buffer.from("not an image"), "fake.jpg")
      .expect(400);
  });

  it("rejects requests to another user's analysis (IDOR)", async () => {
    const owner = await onboardedUser();
    const intruder = await onboardedUser();
    const created = await uploadPhoto(owner, await makeTestPhoto({ r: 10, g: 20, b: 30 }));

    await request(app.getHttpServer())
      .get(`/v1/meal-analyses/${created.id}`)
      .set(intruder)
      .expect(404);
  });

  it("uploads a photo, analyzes it with the mock provider, and confirms it into the diary", async () => {
    const auth = await onboardedUser();
    const created = await uploadPhoto(auth, await makeTestPhoto({ r: 200, g: 50, b: 50 }));
    expect(created.status).toBe("QUEUED");

    const settled = await pollUntilSettled(auth, created.id);
    expect(settled.items.length).toBeGreaterThan(0);
    expect(settled.photoUrl).toMatch(/^https?:\/\//);
    // Every mock scenario's labels match a seeded food exactly (ADR 0013), so nothing
    // should ever require MANUAL_REQUIRED here.
    for (const item of settled.items) {
      expect(item.matchedFoodId).not.toBeNull();
    }

    const confirmed = await request(app.getHttpServer())
      .post(`/v1/meal-analyses/${created.id}/confirm`)
      .set(auth)
      .send({ mealType: "LUNCH" })
      .expect(201);
    expect(confirmed.body.totalCalories).toBeCloseTo(settled.totalCalories, 1);

    const dashboard = await request(app.getHttpServer()).get("/v1/dashboard").set(auth).expect(200);
    expect(dashboard.body.consumed.calories).toBeCloseTo(settled.totalCalories, 1);
  });

  it("AT-004 (photo flow): confirming an already-confirmed analysis returns the same meal, not a duplicate", async () => {
    const auth = await onboardedUser();
    const created = await uploadPhoto(auth, await makeTestPhoto({ r: 30, g: 200, b: 30 }));
    await pollUntilSettled(auth, created.id);

    const first = await request(app.getHttpServer())
      .post(`/v1/meal-analyses/${created.id}/confirm`)
      .set(auth)
      .send({ mealType: "DINNER" })
      .expect(201);
    const second = await request(app.getHttpServer())
      .post(`/v1/meal-analyses/${created.id}/confirm`)
      .set(auth)
      .send({ mealType: "DINNER" })
      .expect(201);

    expect(second.body.id).toBe(first.body.id);
  });

  it("AT-012: refining with free text records a before/after correction and updates the totals", async () => {
    const auth = await onboardedUser();
    const created = await uploadPhoto(auth, await makeTestPhoto({ r: 80, g: 80, b: 220 }));
    const settled = await pollUntilSettled(auth, created.id);
    const firstItemGrams = settled.items[0].grams;

    const refined = await request(app.getHttpServer())
      .post(`/v1/meal-analyses/${created.id}/refine`)
      .set(auth)
      .send({ correctionText: "было 500 г" })
      .expect(201);

    expect(refined.body.items[0].grams).toBe(500);
    expect(refined.body.items[0].grams).not.toBe(firstItemGrams);
  });
});
