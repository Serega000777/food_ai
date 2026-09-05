# ADR 0010: No DailySummary or FoodNutrient tables yet

## Status

Accepted

## Context

Technical spec §8 lists `DailySummary` (cached day totals, "можно поддерживать
incrementally и иметь reconcile job") and `FoodNutrient` (normalized per-nutrient rows,
for micronutrients) as domain entities. Both are optimizations/extensions over what
Phase 3 (manual logging) actually needs to be correct.

## Decision

- **No `DailySummary` table.** `GET /v1/dashboard` and `GET /v1/diary` compute a day's
  totals live, by summing that day's `meal_entries` rows (`packages/nutrition`'s
  `sumMacros`) — not from a maintained cache. At MVP scale (a handful of meals per user
  per day) this is a trivial, always-consistent query; a cache is exactly the kind of
  thing ADR 0006 already warns against building before a real performance problem
  exists. If diary/dashboard reads ever show up in profiling, add the cache + reconcile
  job then, informed by real query plans (master prompt §37: "Measure, do not guess").
- **No `FoodNutrient` table.** `foods` stores the four macro fields
  (calories/protein/fat/carbs per 100g) directly as columns. Micronutrients
  (product blueprint §15, "Nutrition Score и микроэлементы") are an explicitly later
  feature, not MVP — a normalized per-nutrient table has no reader until that feature
  exists, and its shape (which nutrients, what units, RDA references) is exactly the
  kind of thing better designed against that feature's real requirements than guessed
  at now.

## Consequences

- `MealsService`/`DiaryService` are simpler: one source of truth (`meal_entries` +
  `meal_items`), no second write path to keep in sync.
- Adding `DailySummary` later is additive (new table + a write triggered by
  create/update/delete, with the live-sum query kept as the reconcile source of truth)
  — no breaking change to `GET /v1/dashboard`'s contract.
- Adding `FoodNutrient` later means `foods` keeps its four macro columns (still the
  fast path for the common case) while extra nutrients live in the new table, joined in
  only where a screen actually needs them.
