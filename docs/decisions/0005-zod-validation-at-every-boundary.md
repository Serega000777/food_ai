# ADR 0005: Zod for runtime validation at every external boundary

## Status

Accepted

## Context

Three boundaries in this system receive data this codebase does not control and must
never trust blindly: HTTP request bodies, environment variables, and — uniquely to this
product — AI provider responses. The technical spec is explicit that "AI output всегда
валидируется runtime schema" (§6) and that an invalid structured AI response must fail
gracefully (§37, AT-010), never corrupt a meal record. `class-validator`-style decorator
validation does not naturally extend to validating an arbitrary provider JSON payload
against a versioned schema, so one runtime-validation library covers all three cases.

## Decision

Zod is the single runtime validation tool for:

1. Environment variables (`apps/api/src/config/env.ts`, fail-fast on boot).
2. API request/response DTOs, once the first real endpoint lands in Phase 1.
3. `MealVisionResult` and every `VisionProvider`/`FoodDataProvider` response
   (`packages/ai`, `packages/contracts`), versioned via `schemaVersion` (§8, §11).

Shared schemas/types that cross the `apps/api` ↔ `apps/miniapp` boundary live in
`packages/contracts`, inferred from Zod schemas (`z.infer<...>`) so the type and its
runtime check can never drift apart.

## Consequences

- One validation mental model everywhere; no mixing of decorator-based and
  schema-based validation in the same request pipeline.
- AI provider integration (Phase 4/5) gets schema validation "for free" reusing the same
  primitives as API DTOs, instead of a bespoke parser.
