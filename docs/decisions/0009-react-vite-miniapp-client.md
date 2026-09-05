# ADR 0009: React + Vite Telegram Mini App as the first client

## Status

Accepted

## Context

Master prompt §2 separates platforms deliberately: "backend/API/domain/AI/nutrition
logic platform-agnostic; Mini App — только первый client; native clients позже
используют тот же API/contracts." The first, and for now only, client is a Telegram Mini
App — a web page rendered inside Telegram's WebView, not a native app. A sibling project
(`money_dock`) chose Expo/React Native + `react-native-web` specifically because it
needed one codebase to become a native Android/iOS app later without a rewrite (ADR 0004
there). food_ai's master prompt takes the opposite, more incremental stance for its own
MVP: "React + Vite для Telegram Mini App"; native iOS/Android is an explicitly separate,
later client (§45 of the technical spec) that "использует общий API/contracts" — not
necessarily the same UI code.

## Decision

`apps/miniapp`: plain React + Vite + TypeScript, no React Native/Expo layer.

- Ships only what a Telegram Mini App needs: small bundle, fast cold start inside
  Telegram's in-app WebView (`web_app_ready`/`web_app_expand`, per Telegram's own JS
  bridge, `telegram-web-app.js` loaded fresh from `telegram.org` per its docs — never
  self-hosted).
- No data-fetching library (React Query, SWR, ...) — a small `fetch` wrapper
  (`src/api/client.ts`) with token storage and one-shot refresh-on-401 is enough for the
  current screen count and keeps the bundle light (product goal: fast, not
  hardware-heavy).
- Design tokens (`packages/ui-tokens`) are plain CSS custom properties, not a
  cross-platform JS token object — this client is web-only for now; a native client
  later gets its own token consumption without forcing today's CSS into an
  RN-compatible shape prematurely.
- Shares `packages/contracts` (types) with the backend; shares no UI code with any
  future native client — only domain/contracts/config, matching the "no native client
  yet" reality instead of pre-building a cross-platform UI layer nothing uses.

## Consequences

- If/when a native client is built, it is a new, separate client app (Expo or otherwise)
  consuming the same `packages/contracts` — not a refactor of `apps/miniapp` into a
  universal codebase. That is a deliberate trade against `money_dock`'s approach, made
  because the master prompt asks for it explicitly for this product.
- Local development outside real Telegram uses a dev-only `mock_init_data` query-param
  fallback (`src/telegram.ts`, gated on `import.meta.env.DEV`, compiled out of
  production builds) to exercise the real Telegram-auth flow in a plain browser.
