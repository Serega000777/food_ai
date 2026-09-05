import { numeric, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const foodSourceEnum = pgEnum("food_source", ["SEED", "USER"]);
export const foodVerificationLevelEnum = pgEnum("food_verification_level", [
  "VERIFIED",
  "UNVERIFIED",
]);

/**
 * Per-100g macro basis only for now — no separate FoodNutrient/micronutrient table yet
 * (product blueprint's "Nutrition Score и микроэлементы" is a later feature, not MVP;
 * add FoodNutrient when a real multi-nutrient source is actually integrated, not before).
 * `source`/`verificationLevel` exist from day one (technical spec §10: "каждая запись
 * должна иметь источник и verification level") even though Phase 3 only has one source
 * (a small seeded set) — Open Food Facts and similar external providers are Phase 5+.
 */
export const foods = pgTable(
  "foods",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    canonicalName: text("canonical_name").notNull(),
    source: foodSourceEnum("source").notNull(),
    // Stable slug for SEED rows (e.g. "chicken-breast"), re-run-safe via the unique
    // constraint below; null for USER rows, which never need to dedupe against seed
    // data or each other (Postgres treats every NULL as distinct under a unique index).
    sourceId: text("source_id"),
    verificationLevel: foodVerificationLevelEnum("verification_level").notNull(),
    caloriesPer100g: numeric("calories_per_100g", { precision: 7, scale: 2 }).notNull(),
    proteinPer100g: numeric("protein_per_100g", { precision: 6, scale: 2 }).notNull(),
    fatPer100g: numeric("fat_per_100g", { precision: 6, scale: 2 }).notNull(),
    carbsPer100g: numeric("carbs_per_100g", { precision: 6, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("foods_source_source_id_unique").on(table.source, table.sourceId)],
);
