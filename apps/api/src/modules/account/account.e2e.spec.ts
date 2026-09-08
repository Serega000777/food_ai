import { createHmac } from "node:crypto";

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../../app.module";
import { AllExceptionsFilter } from "../../common/all-exceptions.filter";

/** Master prompt §26: account deletion must actually remove the user's data, not just
 * mark it hidden. Only DB rows are asserted here — meal photos (S3 cleanup) already
 * have their own storage-layer coverage; this suite doesn't upload any. */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";

function signInitData(userId: number): string {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    user: JSON.stringify({ id: userId, first_name: "Account", language_code: "ru" }),
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

describe("Account deletion (e2e)", () => {
  let app: INestApplication;

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

  it("DELETE /v1/account removes the user, and the same telegramId re-onboards as a fresh account", async () => {
    const telegramId = nextTelegramUserId();

    const loginRes = await request(app.getHttpServer())
      .post("/v1/auth/telegram")
      .send({ initData: signInitData(telegramId) })
      .expect(200);
    const auth = { Authorization: `Bearer ${loginRes.body.accessToken}` };

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

    await request(app.getHttpServer()).delete("/v1/account").set(auth).expect(204);

    // The access token itself stays validly *signed* until natural expiry (stateless
    // JWT) — what must be gone is the row it points to.
    await request(app.getHttpServer()).get("/v1/me").set(auth).expect(404);

    // Logging in again with the same Telegram identity creates a brand-new user, not
    // the old one back — profile/goal from before deletion must not resurface.
    const secondLoginRes = await request(app.getHttpServer())
      .post("/v1/auth/telegram")
      .send({ initData: signInitData(telegramId) })
      .expect(200);
    const secondAuth = { Authorization: `Bearer ${secondLoginRes.body.accessToken}` };

    const meRes = await request(app.getHttpServer()).get("/v1/me").set(secondAuth).expect(200);
    expect(meRes.body.profile.birthDate).toBeNull();

    await request(app.getHttpServer()).get("/v1/dashboard").set(secondAuth).expect(404);
  });
});
