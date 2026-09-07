export type ConfidenceDecision = "ACCEPTABLE" | "VERIFY_ITEM" | "ASK_QUESTION" | "MANUAL_REQUIRED";

export interface ConfidenceInput {
  /** 0..1, the vision provider's own confidence for this item. */
  visionConfidence: number;
  /** (max - min) / estimated — wider relative range means less certain a portion. */
  gramRangeWidthRatio: number;
  /** e.g. sauce/oil/butter the camera likely can't see (product blueprint §9.2). */
  hiddenCalorieRisk: boolean;
  /** Whether this item resolved to a canonical `Food` record at all. */
  matched: boolean;
}

// Configurable thresholds (master prompt §11/§15: "Пороги хранятся в config/feature
// flags"), started as constants here — move to config the moment a second caller
// needs different values or product wants them tunable without a deploy.
const HIGH_CONFIDENCE = 0.9;
const MEDIUM_CONFIDENCE = 0.7;
const ACCEPTABLE_RANGE_WIDTH_RATIO = 0.3;

/**
 * Never a decision from raw vision confidence alone (master prompt §11: "Порог решения
 * нельзя привязывать только к одному raw confidence"). An unmatched item always needs a
 * human regardless of how confident the vision model was about the *label* — nothing
 * downstream can compute nutrition for a food that isn't in the catalog.
 */
export function decideItemConfidence(input: ConfidenceInput): ConfidenceDecision {
  if (!input.matched) return "MANUAL_REQUIRED";

  const isPreciseEnough = input.gramRangeWidthRatio <= ACCEPTABLE_RANGE_WIDTH_RATIO;

  if (input.visionConfidence >= HIGH_CONFIDENCE && isPreciseEnough && !input.hiddenCalorieRisk) {
    return "ACCEPTABLE";
  }
  if (input.visionConfidence >= MEDIUM_CONFIDENCE) {
    return input.hiddenCalorieRisk ? "ASK_QUESTION" : "VERIFY_ITEM";
  }
  return "ASK_QUESTION";
}

const NEEDS_CLARIFICATION_DECISIONS = new Set<ConfidenceDecision>([
  "VERIFY_ITEM",
  "ASK_QUESTION",
  "MANUAL_REQUIRED",
]);

/** Whole-analysis status is the worst case among its items — one uncertain item is
 * enough to ask before letting the user confirm the whole meal. */
export function analysisNeedsClarification(itemDecisions: ConfidenceDecision[]): boolean {
  return itemDecisions.some((decision) => NEEDS_CLARIFICATION_DECISIONS.has(decision));
}
