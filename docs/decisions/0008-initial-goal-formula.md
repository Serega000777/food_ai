# ADR 0008: Mifflin-St Jeor for the initial calorie/macro plan

## Status

Accepted

## Context

Onboarding must produce a starting calorie/macro plan (product blueprint §5.7) without
any historical intake or weight-trend data — that adaptive refinement is explicitly
Phase 1.3 ("Adaptive Energy Expenditure — не включать в MVP без данных"). The formula
also must never auto-generate an unsafe target (master prompt §28).

## Decision

- **BMR**: Mifflin-St Jeor equation. It is the most widely validated resting-energy
  formula for a general adult population without body-composition (skinfold/DEXA) data,
  and is what most mainstream nutrition apps in this space use for the same reason.
  This is a static, peer-reviewed nutrition-science equation, not a changing SDK/API —
  it is **not** subject to this project's "verify against current official docs" rule
  (ADR 0007's Telegram algorithm, `packages/ai` providers, etc. are).
- **TDEE**: BMR × one of four activity multipliers (1.2 / 1.375 / 1.55 / 1.725),
  matching the four human-worded activity options in onboarding (§4: "Не использовать
  непонятные Sedentary / Lightly active без человеческого объяснения" — the enum values
  are internal; the UI copy is what's human-worded).
- **Goal adjustment**: `calorieTarget = TDEE ± (paceKgPerWeek × 7700 ÷ 7)` for
  LOSE/GAIN, `TDEE` unchanged for MAINTAIN/TRACK. Default pace 0.5 kg/week (blueprint
  §5.6: default should be moderate). A hard floor of 1200 kcal/day applies regardless of
  inputs.
- **Protein**: 2.0 g/kg body weight for LOSE/GAIN (preserves muscle during a deficit,
  supports growth during a surplus), 1.6 g/kg for MAINTAIN/TRACK.
- **Fat**: 25% of total calories — a balanced default within the commonly cited 20–35%
  range.
- **Carbs**: remainder of calories after protein and fat, floored at 0.
- Lives in `packages/domain` (`goal-formula.ts`) as a pure, side-effect-free function —
  no DB/HTTP access — so it is trivially unit-tested and reusable if a native client
  ever needs to preview a plan client-side.

## Consequences

- The formula is intentionally simple and explainable ("это стартовая оценка") rather
  than trying to be maximally accurate — accuracy comes later from real data (Phase
  1.3), not from a more elaborate day-one formula.
- Changing the formula later (e.g. incorporating body-fat estimates) is a domain-package
  change with no API or DB shape impact, since `POST /v1/goals` just calls this function
  and persists the result.
