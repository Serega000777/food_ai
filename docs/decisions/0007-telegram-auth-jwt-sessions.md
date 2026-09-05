# ADR 0007: Telegram-only auth, short-lived JWT + opaque refresh sessions

## Status

Accepted

## Context

MVP has exactly one identity provider — Telegram (technical spec §7: "Mini App передаёт
initData... Backend валидирует подпись/хэш"). There is no near-term plan for
email/phone/Apple sign-in, unlike a sibling project that needed a multi-identity
`user_identities` table from day one. Building that abstraction here now — before any
second provider is speculated, let alone confirmed — would violate ADR 0006's own logic.
Separately, the backend needs a session mechanism that survives client restarts (a
30-day Mini App session, not a 15-minute one) without keeping every access token valid
for that long, and that supports server-side revocation (logout, account deletion).

## Decision

- `users.telegramId` (`bigint`) is a direct, unique column on `User` — no separate
  identity table. If a second provider is ever added, that's the point to introduce one;
  not before.
- `initData` is verified server-side exactly per the official algorithm (HMAC-SHA256,
  `secret_key = HMAC_SHA256(bot_token, "WebAppData")`), re-confirmed against
  https://core.telegram.org/bots/webapps on 2026-09-05 — never trusting
  `initDataUnsafe`. `auth_date` freshness is an app policy (24h + 60s clock-skew
  tolerance), since Telegram's docs recommend checking it without mandating a window.
- Two-token session: a signed JWT **access token** (15 min, `JWT_ACCESS_SECRET`,
  `{ sub: userId }`) for per-request auth, and an opaque, cryptographically random
  **refresh token** stored only as a SHA-256 hash in `sessions` — the plaintext token
  never touches the database, so a DB leak can't be replayed into new sessions.
- Refresh rotates the token on every use (old one revoked, new one issued) and rejects
  reuse of an already-rotated token outright — cheap protection against a stolen refresh
  token being used alongside the legitimate one undetected.
- `POST /v1/auth/telegram`, `/v1/auth/refresh`, `/v1/auth/logout` are rate-limited
  tighter than the app-wide default (technical spec §7: "Auth endpoint rate-limited").

## Consequences

- A user is uniquely and permanently identified by `users.id` everywhere outside the
  auth module; `telegramId` never appears in API responses or logs.
- Losing the refresh token (e.g. Mini App storage cleared) just means re-running the
  Telegram login flow — cheap, since `initData` is already available to the Mini App at
  all times, no separate "forgot password" flow needed.
- Extending to a second identity provider later is a breaking schema change (moving
  `telegramId` off `User` into an identities table), accepted deliberately in exchange
  for a much simpler `User` model while only one provider exists.
