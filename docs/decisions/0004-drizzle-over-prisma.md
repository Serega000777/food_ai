# ADR 0004: Drizzle over Prisma

## Status

Accepted

## Context

Master prompt §3 allows "Prisma либо другой зрелый ORM". The product must stay fast and
light on infrastructure (explicit product requirement: the service should not be heavy
on hardware), and the schema needs raw control over units/precision for nutrient values
and UTC timestamps (technical spec §9).

## Decision

Drizzle ORM (`drizzle-orm` + `drizzle-kit`) over `postgres-js`.

- No separate query-engine binary or generated client step blocking cold start — the
  schema _is_ the TypeScript types, checked by `tsc`.
- SQL-shaped query builder makes the exact numeric types/rounding behavior for nutrient
  values (§7 Nutrition Engine: "rounding only at presentation boundary") explicit and
  reviewable, rather than hidden behind an ORM abstraction.
- Migrations are plain, readable SQL files (`infrastructure/migrations`), diffable in
  code review — important once nutrition/food tables evolve frequently.

## Consequences

- One more thing to learn if a future contributor only knows Prisma, offset by materially
  lower runtime footprint and faster `pnpm build`/cold start — directly serving the
  product's "fast, lightweight service" requirement.
- `drizzle-kit generate` must be run and its output committed whenever the schema
  changes; there is no implicit migration step.
