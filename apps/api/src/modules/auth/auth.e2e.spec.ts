import { createHmac } from "node:crypto";

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../../app.module";

/**
 * Exercises the real HTTP stack against a real Postgres (see infrastructure/docker and
 * CI). Requires migrations to already be applied — see README "Быстрый старт" / CI workflow.
 * Covers the critical acceptance tests from the technical spec: AT-001, AT-002, AT-003.
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";

function signInitData(userId: number, authDateSeconds?: number): string {
  const params = new URLSearchParams({
    auth_date: String(authDateSeconds ?? Math.floor(Date.now() / 1000)),
    user: JSON.stringify({ id: userId, first_name: "E2E", language_code: "ru" }),
  });
  const dataCheckString = [...params.entries()]
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
  params.set("hash", createHmac("sha256", secretKey).update(dataCheckString).digest("hex"));
  return params.toString();
}

// Date.now() alone risks collisions with rows left over by a previous run of this same
// suite (Postgres isn't reset between runs) — a per-run random prefix plus a monotonic
// counter keeps every generated Telegram id unique within and across runs.
let idCounter = 0;
const runPrefix = Math.floor(Math.random() * 1_000_000);
function nextTelegramUserId(): number {
  idCounter += 1;
  return runPrefix * 1_000_000 + idCounter;
}

async function loginAsNewUser(app: INestApplication, userId: number) {
  const res = await request(app.getHttpServer())
    .post("/v1/auth/telegram")
    .send({ initData: signInitData(userId) })
    .expect(200);
  return res.body as { accessToken: string; refreshToken: string; user: { id: string } };
}

describe("Auth (e2e)", () => {
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

  it("AT-001: rejects initData with an invalid signature", async () => {
    // Appending an extra field changes the data-check-string without touching `hash` itself,
    // so this actually invalidates the signature (unlike mutating `hash`, where an odd
    // trailing hex nibble gets silently dropped by Buffer.from(..., "hex")).
    await request(app.getHttpServer())
      .post("/v1/auth/telegram")
      .send({ initData: `${signInitData(nextTelegramUserId())}&tampered=1` })
      .expect(401);
  });

  it("AT-002: rejects stale initData beyond the configured freshness window", async () => {
    const staleAuthDate = Math.floor(Date.now() / 1000) - 25 * 60 * 60; // 25h old
    await request(app.getHttpServer())
      .post("/v1/auth/telegram")
      .send({ initData: signInitData(nextTelegramUserId(), staleAuthDate) })
      .expect(401);
  });

  it("AT-003: valid auth twice logs into the same user, no duplicate", async () => {
    const userId = nextTelegramUserId();
    const first = await loginAsNewUser(app, userId);
    const second = await loginAsNewUser(app, userId);
    expect(second.user.id).toBe(first.user.id);
  });

  it("rejects requests to protected routes without a token", async () => {
    await request(app.getHttpServer()).get("/v1/me").expect(401);
  });

  it("returns the current user and an empty profile on /me right after first login", async () => {
    const { accessToken } = await loginAsNewUser(app, nextTelegramUserId());
    const res = await request(app.getHttpServer())
      .get("/v1/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toMatchObject({
      profile: { birthDate: null, sex: null, heightCm: null, unitSystem: "metric" },
    });
  });

  it("rotates refresh tokens and rejects reuse of a rotated token", async () => {
    const { refreshToken } = await loginAsNewUser(app, nextTelegramUserId());

    const rotated = await request(app.getHttpServer())
      .post("/v1/auth/refresh")
      .send({ refreshToken })
      .expect(200);
    expect(rotated.body.refreshToken).not.toBe(refreshToken);

    await request(app.getHttpServer()).post("/v1/auth/refresh").send({ refreshToken }).expect(401);
  });

  it("revokes a session on logout so it can no longer be refreshed", async () => {
    const { refreshToken } = await loginAsNewUser(app, nextTelegramUserId());
    await request(app.getHttpServer()).post("/v1/auth/logout").send({ refreshToken }).expect(204);
    await request(app.getHttpServer()).post("/v1/auth/refresh").send({ refreshToken }).expect(401);
  });
});
