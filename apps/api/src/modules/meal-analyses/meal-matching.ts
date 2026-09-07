import type { MealVisionItem } from "@food-ai/ai";
import { decideItemConfidence, type ConfidenceDecision } from "@food-ai/domain";
import { ilike } from "drizzle-orm";

import type { Database } from "../../db/client";
import { foods } from "../../db/schema";

export interface MatchedCandidate {
  label: string;
  matchedFoodId: string | null;
  estimatedGrams: number;
  gramRangeMin: number;
  gramRangeMax: number;
  confidence: number;
  hiddenCalorieRisk: boolean;
  decision: ConfidenceDecision;
}

/**
 * Exact/ILIKE lookup against the seeded catalog (ADR 0013 — every mock scenario label
 * matches a `foods.canonicalName` exactly, by design). Real fuzzy matching against a
 * real provider's free-text labels is Phase 5's problem, against that provider's
 * actual vocabulary — not guessed at here.
 */
export async function matchAndDecideItems(
  db: Database,
  items: MealVisionItem[],
): Promise<MatchedCandidate[]> {
  const results: MatchedCandidate[] = [];

  for (const item of items) {
    const [match] = await db.select().from(foods).where(ilike(foods.canonicalName, item.label));
    const [rangeMin, rangeMax] = item.gramRange;
    const gramRangeWidthRatio =
      item.estimatedGrams > 0 ? (rangeMax - rangeMin) / item.estimatedGrams : 1;

    const decision = decideItemConfidence({
      visionConfidence: item.confidence,
      gramRangeWidthRatio,
      hiddenCalorieRisk: item.hiddenCalorieRisk ?? false,
      matched: Boolean(match),
    });

    results.push({
      label: item.label,
      matchedFoodId: match?.id ?? null,
      estimatedGrams: item.estimatedGrams,
      gramRangeMin: rangeMin,
      gramRangeMax: rangeMax,
      confidence: item.confidence,
      hiddenCalorieRisk: item.hiddenCalorieRisk ?? false,
      decision,
    });
  }

  return results;
}
