import { index, integer, numeric, pgEnum, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "./users";

export const goalTypeEnum = pgEnum("goal_type", ["LOSE", "MAINTAIN", "GAIN", "TRACK"]);
export const goalSourceEnum = pgEnum("goal_source", ["INITIAL_FORMULA", "USER", "ADAPTIVE"]);

/** Tables land in Phase 1; the initial-formula calculation and `POST /v1/goals` endpoint
 * that populate this table are Phase 2 (onboarding). */
export const goals = pgTable(
  "goals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: goalTypeEnum("type").notNull(),
    targetWeightKg: numeric("target_weight_kg", { precision: 5, scale: 2 }),
    paceKgPerWeek: numeric("pace_kg_per_week", { precision: 4, scale: 2 }),
    calorieTarget: integer("calorie_target").notNull(),
    proteinTargetG: integer("protein_target_g").notNull(),
    fatTargetG: integer("fat_target_g").notNull(),
    carbTargetG: integer("carb_target_g").notNull(),
    source: goalSourceEnum("source").notNull(),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull().defaultNow(),
    effectiveTo: timestamp("effective_to", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("goals_user_id_effective_idx").on(table.userId, table.effectiveFrom)],
);
