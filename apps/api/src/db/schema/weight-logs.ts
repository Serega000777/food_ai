import { index, numeric, pgEnum, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "./users";

export const weightSourceEnum = pgEnum("weight_source", ["ONBOARDING", "MANUAL"]);

/** Table exists since onboarding (which needs to persist the starting weight
 * measurement), but the Progress feature reading it — trend line, 7/30/90-day views,
 * `POST /v1/weights` for manual entries — is Phase 6 (master prompt §20). */
export const weightLogs = pgTable(
  "weight_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    weightKg: numeric("weight_kg", { precision: 5, scale: 2 }).notNull(),
    measuredAt: timestamp("measured_at", { withTimezone: true }).notNull(),
    source: weightSourceEnum("source").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("weight_logs_user_id_measured_at_idx").on(table.userId, table.measuredAt)],
);
