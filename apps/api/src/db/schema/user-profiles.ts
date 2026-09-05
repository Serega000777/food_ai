import { date, integer, pgEnum, pgTable, uuid } from "drizzle-orm/pg-core";

import { users } from "./users";

export const sexEnum = pgEnum("sex", ["male", "female"]);
export const unitSystemEnum = pgEnum("unit_system", ["metric", "imperial"]);

/** One row per user, created empty alongside the User (UsersService) and filled in by
 * onboarding (Phase 2) — so `/me` always has a profile to return, never a 404 branch. */
export const userProfiles = pgTable("user_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  birthDate: date("birth_date"),
  sex: sexEnum("sex"),
  heightCm: integer("height_cm"),
  unitSystem: unitSystemEnum("unit_system").notNull().default("metric"),
});
