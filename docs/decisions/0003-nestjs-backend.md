# ADR 0003: NestJS (Express adapter) as the backend framework

## Status

Accepted

## Context

Master prompt §3 leaves the choice open between "NestJS с подходящим adapter либо
зрелый Fastify-based вариант". The backend needs: DI for swapping AI/food-data
providers (§8, §11), a queue/worker story (BullMQ) for photo analysis (Phase 4), guards
for Telegram auth and rate limiting, and a testing story that doesn't fight the
framework.

## Decision

NestJS with the standard Express platform adapter (`@nestjs/platform-express`).
Rationale over raw Fastify or a minimal framework:

- First-class DI makes `VisionProvider`, `FoodDataProvider`, and `EntitlementService`
  swappable by binding an interface to an implementation, not by hand-rolled factories.
- `@nestjs/config` + `@nestjs/throttler` cover env validation and rate limiting (both
  required by the security spec, §26) without extra packages.
- `@nestjs/testing` gives fast, isolated unit tests for controllers/services (see
  `health.controller.spec.ts`) without booting a full HTTP server.
- Express over Fastify: no performance-critical path at MVP scale justifies Fastify's
  extra adapter-compatibility tax on Nest middleware/guards; revisit only if profiling
  shows the HTTP layer, not AI/DB calls, is the bottleneck.

## Consequences

- Module boundaries map directly onto ADR 0001's modular-monolith modules.
- Swapping to Fastify later is possible (Nest's adapter is pluggable) but not planned.
