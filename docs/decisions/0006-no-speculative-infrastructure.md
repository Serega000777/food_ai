# ADR 0006: No Redis, queue, or object storage until a real use case exists

## Status

Accepted

## Context

The eventual architecture needs Redis/BullMQ (async photo analysis, Phase 4) and
S3-compatible storage (meal photos, Phase 4). It is tempting to stand all three up now
"for later". The product explicitly asks for a fast service that does not load hardware
unnecessarily, and every extra managed dependency is another moving part to run,
monitor, and pay for before it earns its keep.

## Decision

Phase 0–3 ship with exactly two runtime dependencies: the API container and PostgreSQL.
No queue, no cache, no object storage yet.

- Manual/text meal logging (Phase 3) is a synchronous request — there is no AI call on
  that path, so nothing to queue.
- Redis + BullMQ are introduced in Phase 4, exactly when `analyze-meal-photo` becomes a
  real background job with bounded retries (technical spec §32).
- S3-compatible object storage (MinIO locally) is introduced in the same phase, exactly
  when meal photos exist to store — never in Postgres (technical spec §9).
- Rate limiting until then uses in-memory `@nestjs/throttler` (single API instance at
  MVP scale); a shared Redis-backed limiter is a Phase-4-or-later upgrade if multiple
  instances are ever run.

## Consequences

- Lower hosting cost and fewer failure modes through Phase 0–3.
- `VisionProvider` and `FoodDataProvider` (ADR 0001) are still designed as interfaces
  specifically so that adding a queue/storage behind them later is an internal change,
  not an API-breaking one.
- `infrastructure/docker/docker-compose.yml` grows to include `redis` and a MinIO
  service exactly when Phase 4 starts consuming them — not before.
