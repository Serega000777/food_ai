# ADR 0015: Phase 6 — recent meals, weight/progress, first-party analytics

## Status

Accepted

## Context

Phase 6 (master prompt §40) bundles four otherwise-unrelated features: recent/frequent
meals with a repeat flow (§19), weight + progress (§20), and product analytics events
(§28). Each needed a small design decision the master prompt states as a principle but
not a concrete mechanism.

## Decisions

**Recent/frequent meals, no new table.** `GET /v1/recent-meals` groups a user's last 50
`meal_entries` by the sorted set of their matched `foodId`s — eating the same combo at
slightly different gram amounts still counts as one repeatable "recent meal". Each
group's most recent occurrence becomes its display template; occurrence count doubles
as a naive "frequent" signal, sorted by recency. This is explicitly the MVP mechanism
the master prompt calls for ("recent meals based on history") — full Personal Food
Memory (habitual portions, brand/recipe matching, time-of-day priors) is later work,
not this phase, per §19.

**REPEAT joins `meal_source`.** Repeating copies the source meal's items through the
existing `MealsService.create()` path (so nutrition is recomputed from current food
data, never trusted from the old snapshot) with `source: "REPEAT"`, via a new
`POST /v1/meals/repeat`. `GET /v1/recent-meals` is its own top-level controller
(matching the exact path in §30) that delegates to `MealsService` rather than a new
table, since the data already lives in `meal_entries`.

**Weight "add/edit" is one upsert-by-local-day, not a second endpoint.** §20 says
"add/edit weight" but §30 lists only `POST /v1/weights`. Re-logging weight on a day
that already has an entry (including onboarding's initial measurement) updates it in
place rather than creating a second point for the same day — simpler than a separate
PATCH endpoint and avoids a trend line with two dots on one day.

**Progress averages over logged days, not calendar days.** `GET /v1/progress` divides
calorie/macro sums by the count of distinct local days that actually have a meal
logged (`daysLogged`), not the full 7/30/90-day range (`daysInRange`) — both are
returned so the client can show "X ккал в среднем (Y из Z дней)" honestly. Averaging
over the full range would let missed days silently drag the number down, which reads
as failure — exactly what §20's "no shame" principle warns against.

**Analytics events: a first-party table, not PostHog.** ADR 0006 (no speculative
infrastructure) argues against adding a vendor dependency before it's actually needed.
Phase 6 is the first phase with a real, current use for product analytics, so
`analytics_events` (id, userId, type, properties jsonb, createdAt) is added directly —
enough to compute the §28 KPIs later without taking on PostHog now. `type` stays a
free-text column rather than a Postgres enum: `@food-ai/analytics`'s
`AnalyticsEventType` union is the taxonomy's source of truth and is expected to grow
every phase, so a DB enum would mean a migration per new event name for no real safety
benefit the TS type doesn't already give at the call site. Recording is fire-and-forget
(`AnalyticsService.track` never throws into the caller) — an analytics write must never
fail the user action it's attached to.

Only server-observable events with one clear call site are wired up this phase:
`meal_confirmed` (`MealsService.create`), `meal_corrected` (`MealAnalysesService.refine`),
`recent_meal_repeated` (`MealsService.repeat`), `diary_opened` (`DiaryController`, not
`DiaryService` — `DashboardService` also calls `getDiary()` internally to build the Home
screen, and a dashboard load isn't a diary_opened), `progress_opened`
(`ProgressService.getProgress`). Client-only UX events (`photo_capture_started`,
`meal_add_opened`, etc.) and future-phase events (`paywall_viewed`, `subscribed`) are
listed in the shared type for taxonomy consistency but have no emitter yet — that's
real future work, not unused scaffolding.

## Consequences

- No new infrastructure (queue, vendor SDK) for analytics — a Postgres table already
  covers Phase 6's need, revisited only if/when volume or dashboarding actually
  requires it.
- `packages/analytics` is genuinely new target structure (README/master prompt §4)
  materializing exactly when a phase first needs it, matching how `packages/ai` and the
  photo-pipeline infra were only added in their own phases (ADR 0006).
- Recent-meals' food-id-signature grouping is a heuristic, not a stored concept — it
  recomputes on every request from the last 50 entries, trading a small amount of CPU
  for zero new schema/migration risk. Revisit if the scan limit turns out to matter for
  actual users' history size.
