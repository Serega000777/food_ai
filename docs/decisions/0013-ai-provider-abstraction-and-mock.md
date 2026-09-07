# ADR 0013: VisionProvider abstraction with a deterministic mock first

## Status

Accepted

## Context

Master prompt §8/§43 is explicit: the project must never be locked to one AI vendor,
and "live AI calls не должны быть обязательны в обычном CI." The owner's own
pre-flight checklist says to pick a real vision provider only "после короткого
quality/cost benchmark" — a decision for the project owner, not something to guess at
mid-implementation. Phase 4's job is to prove the whole pipeline (upload → queue →
analysis → matching → confidence → confirm) works, independent of which real provider
eventually fills the `VisionProvider` slot.

## Decision

`packages/ai` defines the provider-agnostic contract and ships exactly one
implementation for now: a deterministic `MockVisionProvider`.

```ts
interface VisionProvider {
  analyzeMeal(image: ImageInput, context: PersonalContext): Promise<MealVisionResult>;
  refineMeal(input: RefineInput, context: PersonalContext): Promise<MealVisionResult>;
}
```

- `MockVisionProvider` picks a canned scenario deterministically from the uploaded
  image's SHA-256 hash (same photo → same result, across runs and machines — needed
  for repeatable tests) — it does not "look at" pixels at all, which is honest: it is
  a contract-shaped stand-in, not a vision model.
- Every canned scenario's item labels match a seeded `foods.canonicalName` exactly, so
  Phase 4's food-matching step can stay a simple exact/ILIKE lookup — real fuzzy
  matching against an AI model's free-text labels is a Phase 5 concern, once a real
  provider's actual label vocabulary exists to design against.
- `AI_PROVIDER_PRIMARY=mock` selects it via the same env-driven provider selection a
  real provider (Phase 5) will use — swapping providers is a config change once one is
  chosen, not a code change to the analysis pipeline.
- No live provider tests run in CI (nothing to call yet); this stays true in Phase 5 by
  design (master prompt §31: "Live paid AI tests не должны запускаться в обычном CI").

## Consequences

- The entire Phase 4 vertical slice (state machine, queue, confidence engine, confirm,
  UI) is fully testable and demoable without any API key or network dependency.
- Phase 5 adds a second `VisionProvider` implementation and a benchmark harness
  (master prompt §32) to actually choose one — this ADR is deliberately silent on
  which provider that will be.
