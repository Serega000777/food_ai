import { index, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { foods } from "./foods";
import { mealEntries } from "./meal-entries";

/** Snapshots the nutrient values at the time of logging — never re-derived from
 * `foods` later, so editing a food's canonical data never silently rewrites history
 * (matches Correction's before/after philosophy: master prompt §16). `foodId` is
 * nullable because a matched-but-later-deleted food must not orphan the historical
 * entry (`onDelete: "set null"`), not because Phase 3 ever creates items without one. */
export const mealItems = pgTable(
  "meal_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    mealEntryId: uuid("meal_entry_id")
      .notNull()
      .references(() => mealEntries.id, { onDelete: "cascade" }),
    foodId: uuid("food_id").references(() => foods.id, { onDelete: "set null" }),
    displayName: text("display_name").notNull(),
    grams: numeric("grams", { precision: 7, scale: 2 }).notNull(),
    caloriesSnapshot: numeric("calories_snapshot", { precision: 8, scale: 2 }).notNull(),
    proteinGSnapshot: numeric("protein_g_snapshot", { precision: 7, scale: 2 }).notNull(),
    fatGSnapshot: numeric("fat_g_snapshot", { precision: 7, scale: 2 }).notNull(),
    carbsGSnapshot: numeric("carbs_g_snapshot", { precision: 7, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("meal_items_meal_entry_id_idx").on(table.mealEntryId)],
);
