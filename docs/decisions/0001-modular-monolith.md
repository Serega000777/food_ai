# ADR 0001: Modular monolith, not microservices

## Status

Accepted

## Context

The product is a single-team MVP: a Telegram Mini App backed by one Postgres database.
Microservices earn their cost only when independent scaling, independent deploys, or
independent teams are real constraints — none apply yet, and premature service
boundaries would force network calls, distributed transactions, and duplicated auth for
no benefit. The technical spec is explicit on this point (§6): "На MVP не вводить
микросервисы без необходимости: предпочтителен modular monolith + worker."

## Decision

Backend is one NestJS application (`apps/api`) organized into modules with explicit
public interfaces (Auth, Users, Goals, Meals, Diary, Foods, AI, Weight, ...). Modules
may not reach into each other's repositories or entities directly — only through
exported services. No module may introduce a circular dependency on another.

External systems (Telegram, vision/LLM providers, nutrition data sources, object
storage) are integrated through provider interfaces defined in the owning
module/package (`packages/ai`, `packages/telegram`, a `FoodDataProvider`), never called
directly from domain code. Background job processing (photo analysis, cleanup) runs as
BullMQ processors registered inside the same deployable, not a separately deployed
service, until real load says otherwise (see ADR 0006).

## Consequences

- One deployable, one database, one migration history — simple ops for a small team.
- If a module later needs to become an independent service, its already-explicit public
  interface makes extraction mechanical instead of a rewrite.
- Enforced by convention + code review now; a dependency-cruiser/ESLint boundary rule can
  be added once module count makes accidental coupling likely.
