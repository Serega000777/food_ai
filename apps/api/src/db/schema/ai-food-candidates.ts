import { boolean, index, numeric, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { aiAnalyses } from "./ai-analyses";
import { foods } from "./foods";

/** Mirrors packages/domain's ConfidenceDecision — kept as a DB enum (not just a type)
 * so `GET /v1/meal-analyses/:id` can filter/report by decision without recomputing it
 * from raw confidence on every read. */
export const confidenceDecisionEnum = pgEnum("confidence_decision", [
  "ACCEPTABLE",
  "VERIFY_ITEM",
  "ASK_QUESTION",
  "MANUAL_REQUIRED",
]);

export const aiFoodCandidates = pgTable(
  "ai_food_candidates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    analysisId: uuid("analysis_id")
      .notNull()
      .references(() => aiAnalyses.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    // Null until food matching resolves it (or never, if nothing matched) — a
    // MANUAL_REQUIRED decision always accompanies a null match.
    matchedFoodId: uuid("matched_food_id").references(() => foods.id, { onDelete: "set null" }),
    estimatedGrams: numeric("estimated_grams", { precision: 6, scale: 2 }).notNull(),
    gramRangeMin: numeric("gram_range_min", { precision: 6, scale: 2 }),
    gramRangeMax: numeric("gram_range_max", { precision: 6, scale: 2 }),
    confidence: numeric("confidence", { precision: 4, scale: 3 }).notNull(),
    hiddenCalorieRisk: boolean("hidden_calorie_risk").notNull().default(false),
    decision: confidenceDecisionEnum("decision").notNull(),
  },
  (table) => [index("ai_food_candidates_analysis_id_idx").on(table.analysisId)],
);
