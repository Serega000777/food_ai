# ADR 0014: Gemini as the first real VisionProvider

## Status

Accepted

## Context

[ADR 0013](0013-ai-provider-abstraction-and-mock.md) deliberately stayed silent on
which real provider would fill the `VisionProvider` slot, leaving that to a benchmark
the project owner would run later (master prompt §32). Asked directly, the owner opted
to skip a formal multi-vendor benchmark for Phase 5 and go with Google Gemini, on the
strength of its free tier — cost is the deciding factor for a pre-revenue project, not
a marginal accuracy difference between vendors.

## Decision

`packages/ai` gains a second `VisionProvider` implementation, `GeminiVisionProvider`,
using the official `@google/genai` SDK (`ai.models.generateContent`, confirmed against
the installed package's own type definitions rather than trusting docs prose, since a
fetched doc summary described a different, unrelated `interactions` API for this SDK
version).

- Structured output via `responseMimeType: "application/json"` +
  `responseJsonSchema` (Gemini's OpenAPI-3.0-subset schema support) mirroring
  `mealVisionResultSchema` — the provider itself does not re-validate with Zod;
  `apps/api`'s `runAnalysis` already runs every provider's raw output through
  `parseMealVisionResult` before trusting it (AT-010), so a second check here would be
  redundant.
- The model name is configurable (`GEMINI_MODEL`, default `gemini-3.8-flash`) rather
  than hardcoded — Google's Flash-generation naming has moved before and will again,
  and free-tier eligibility is tied to the specific model, not just "Flash" in general.
- A per-call timeout (`GeminiVisionProviderOptions.timeoutMs`, default 20s) guards
  against a hanging request blocking a queue worker indefinitely.
- Selected via the existing `AI_PROVIDER_PRIMARY` env var (`"gemini"`), validated by
  `env.ts` to require `GEMINI_API_KEY` whenever that value is chosen. Default stays
  `"mock"` — nothing changes for local dev or CI unless someone opts in.
- Fixed a latent Phase 4 bug found while wiring this in: `meal_photos` never stored the
  upload's real MIME type, and `runAnalysis` hardcoded `"image/jpeg"` when calling the
  provider. Harmless for `MockVisionProvider` (which ignores `mimeType`), but would
  have silently sent PNG/WebP bytes to Gemini labeled as JPEG. Added a `mime_type`
  column and threaded the real, server-detected value through.
- `AnalyzeMealPhotoProcessor` is now attempt-aware: a transient provider failure
  (timeout, rate limit) only marks the analysis `ANALYSIS_FAILED` in the DB on the
  job's last BullMQ attempt; earlier failures rethrow so BullMQ's existing retry/backoff
  (ADR 0012) handles them without ever surfacing a failure the user didn't actually hit.

## Consequences

- Real photo analysis now costs nothing on Gemini's free tier, at the usual free-tier
  risk: rate limits, and the vendor changing model availability/naming without notice
  (mitigated by keeping the model name in config, not code).
- No live Gemini calls run in CI (master prompt §31) — `GeminiVisionProvider` is unit
  tested with `@google/genai` mocked; only a manual, local smoke test against the real
  API (with a real key, never committed) validates live wiring.
- Switching primary provider, or adding a third one later, stays a config change plus
  one new `case` in `AiModule`'s factory — no changes to the analysis pipeline itself.
