import { createHash } from "node:crypto";

import type { MealVisionResult } from "./schema";
import type { ImageInput, PersonalContext, RefineInput, VisionProvider } from "./types";

const SCHEMA_VERSION = "mock-v1";

/** Every label matches a seeded `foods.canonicalName` exactly (ADR 0013) — food
 * matching in Phase 4 stays a simple lookup; fuzzy matching against a real model's
 * free-text labels is Phase 5's problem, against that model's actual vocabulary. */
const SCENARIOS: MealVisionResult[] = [
  {
    schemaVersion: SCHEMA_VERSION,
    dishName: "Курица с рисом",
    items: [
      { label: "Куриная грудка", estimatedGrams: 150, gramRange: [120, 180], confidence: 0.93 },
      { label: "Рис варёный", estimatedGrams: 200, gramRange: [160, 240], confidence: 0.88 },
    ],
    overallConfidence: 0.9,
  },
  {
    schemaVersion: SCHEMA_VERSION,
    dishName: "Овсянка с бананом",
    items: [
      { label: "Овсянка на воде", estimatedGrams: 250, gramRange: [200, 300], confidence: 0.85 },
      { label: "Банан", estimatedGrams: 100, gramRange: [80, 120], confidence: 0.9 },
    ],
    overallConfidence: 0.87,
  },
  {
    schemaVersion: SCHEMA_VERSION,
    dishName: "Творог",
    items: [{ label: "Творог 5%", estimatedGrams: 150, gramRange: [130, 180], confidence: 0.91 }],
    overallConfidence: 0.91,
  },
  {
    // Deliberately low/mixed confidence — exercises VERIFY_ITEM/ASK_QUESTION and the
    // hidden-calorie-risk path (product blueprint §9.2) in the confidence engine.
    schemaVersion: SCHEMA_VERSION,
    dishName: "Салат",
    items: [
      { label: "Огурец", estimatedGrams: 80, gramRange: [50, 110], confidence: 0.62 },
      { label: "Помидор", estimatedGrams: 90, gramRange: [60, 120], confidence: 0.58 },
      {
        label: "Оливковое масло",
        estimatedGrams: 10,
        gramRange: [0, 25],
        confidence: 0.35,
        hiddenCalorieRisk: true,
      },
    ],
    overallConfidence: 0.52,
  },
];

function pickScenario(image: ImageInput): MealVisionResult {
  const hash = createHash("sha256").update(image.buffer).digest();
  const firstByte = hash[0] ?? 0; // sha256 digest is always 32 bytes; fallback is unreachable.
  const scenario = SCENARIOS[firstByte % SCENARIOS.length];
  if (!scenario) throw new Error("unreachable: index is always within SCENARIOS bounds");
  return structuredClone(scenario);
}

/** Extracts "<number> г"-style overrides from free text, in order, and applies them
 * positionally to the previous items. Anything it can't parse is left unchanged — an
 * honest limitation of a mock, not an attempt at real NLP (that's Phase 5, packages/ai
 * gaining a real `TextMealParser`-backed provider). */
function applyGramOverrides(result: MealVisionResult, correctionText: string): MealVisionResult {
  const matches = [...correctionText.matchAll(/(\d+(?:[.,]\d+)?)\s*г/gi)].map((m) =>
    // The capture group is mandatory in the pattern, so m[1] always exists when the
    // overall match does; the fallback only appeases noUncheckedIndexedAccess.
    Number((m[1] ?? "0").replace(",", ".")),
  );
  if (matches.length === 0) return result;

  const items = result.items.map((item, index) => {
    const grams = matches[index];
    if (grams === undefined) return item;
    return { ...item, estimatedGrams: grams, gramRange: [grams, grams] as [number, number] };
  });
  return { ...result, items };
}

export class MockVisionProvider implements VisionProvider {
  readonly name = "mock";

  analyzeMeal(image: ImageInput, _context: PersonalContext): Promise<MealVisionResult> {
    return Promise.resolve(pickScenario(image));
  }

  refineMeal(input: RefineInput, _context: PersonalContext): Promise<MealVisionResult> {
    return Promise.resolve(applyGramOverrides(input.previousResult, input.correctionText));
  }
}
