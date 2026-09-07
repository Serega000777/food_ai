import { index, jsonb, pgEnum, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { aiAnalyses } from "./ai-analyses";
import { users } from "./users";

/** Exactly the set from master prompt §16. Phase 4 only ever writes TEXT_REFINEMENT
 * (the `/refine` endpoint); the rest exist for the item-level editing UI Phase 5's
 * richer AI Result screen adds — declared now so the type doesn't need revisiting. */
export const correctionTypeEnum = pgEnum("correction_type", [
  "FOOD_CHANGED",
  "GRAMS_CHANGED",
  "ITEM_ADDED",
  "ITEM_REMOVED",
  "HIDDEN_CALORIE_ADDED",
  "TOTAL_SCALE_CHANGED",
  "TEXT_REFINEMENT",
]);

/** `before`/`after` are opaque JSON snapshots of the affected candidates, never
 * overwritten in place (master prompt §16: "Нельзя просто перезаписывать результат"). */
export const corrections = pgTable(
  "corrections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    analysisId: uuid("analysis_id").references(() => aiAnalyses.id, { onDelete: "cascade" }),
    type: correctionTypeEnum("type").notNull(),
    before: jsonb("before").notNull(),
    after: jsonb("after").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("corrections_analysis_id_idx").on(table.analysisId)],
);
