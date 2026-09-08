import { index, numeric, pgEnum, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "./users";

export const mealTypeEnum = pgEnum("meal_type", ["BREAKFAST", "LUNCH", "DINNER", "SNACK", "OTHER"]);
// VOICE/BARCODE join once those logging paths exist (Phase 1.1) — REPEAT joined in
// Phase 6 (master prompt §19's repeat flow). A MealEntry itself needs no intermediate
// status column regardless of source: by the time one exists it's already final,
// whether it came straight from manual input or from a confirmed AIAnalysis (whose own
// draft/analyzing states live on that row instead, master prompt §9).
export const mealSourceEnum = pgEnum("meal_source", ["MANUAL", "TEXT", "PHOTO", "REPEAT"]);

/** totals are a denormalized snapshot (sum of this entry's meal_items, computed by
 * packages/nutrition) so the dashboard/diary can read a day's meals without summing
 * items in every query — recomputed by MealsService whenever items change. */
export const mealEntries = pgTable(
  "meal_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mealType: mealTypeEnum("meal_type").notNull(),
    eatenAt: timestamp("eaten_at", { withTimezone: true }).notNull(),
    source: mealSourceEnum("source").notNull(),
    totalCalories: numeric("total_calories", { precision: 8, scale: 2 }).notNull(),
    proteinG: numeric("protein_g", { precision: 7, scale: 2 }).notNull(),
    fatG: numeric("fat_g", { precision: 7, scale: 2 }).notNull(),
    carbsG: numeric("carbs_g", { precision: 7, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("meal_entries_user_id_eaten_at_idx").on(table.userId, table.eatenAt)],
);
