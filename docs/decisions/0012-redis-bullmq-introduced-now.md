# ADR 0012: Redis + BullMQ introduced now — the trigger ADR 0006 named has arrived

## Status

Accepted

## Context

ADR 0006 deliberately deferred Redis/queue infrastructure: "Redis + BullMQ are
introduced in Phase 4, exactly when `analyze-meal-photo` becomes a real background job
with bounded retries." Phase 4 is that phase. Running vision analysis synchronously
inside the HTTP request would block the Mini App on provider latency (seconds even for
the mock, real seconds-to-tens-of-seconds for a real provider in Phase 5) and gives no
way to retry a transient provider failure without the client re-uploading.

## Decision

- `infrastructure/docker/docker-compose.yml` gains a `redis` service (Phase 0–3 had
  Postgres only).
- `analyze-meal-photo` is a BullMQ job: `POST /v1/meals/photo` enqueues it and returns
  immediately with the analysis in `QUEUED` state; a worker processor picks it up,
  calls the configured `VisionProvider`, and drives the `AIAnalysis` state machine
  forward.
- Bounded retries (a fixed small attempt count with backoff) on the job — a transient
  provider timeout should not require the user to re-upload the photo.
- The worker runs in-process in `apps/api` for now (registered as a Nest
  `@Processor`), not a separately deployed `apps/worker` — ADR 0001's modular-monolith
  reasoning applies here too: nothing yet demands independent scaling of the worker.
  Extracting it later is moving where the same processor class runs, not a rewrite.

## Consequences

- The client polls `GET /v1/meal-analyses/:id` (simple, matches Mini App reality —
  no WebSocket infra needed for a result that arrives in low single-digit seconds).
- Killing the API process mid-job loses in-flight (but not yet-queued) jobs at this
  stage — BullMQ's persistence to Redis means queued-but-not-started jobs survive a
  restart; acceptable for MVP, revisit only if this is ever observed to matter.
