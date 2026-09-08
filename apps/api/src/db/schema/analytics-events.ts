import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "./users";

/** First-party table, not PostHog/Segment (ADR 0006, ADR 0015) — Phase 6 is the first
 * real consumer of product analytics, and a plain table is enough to compute the
 * master prompt §28 KPIs later without taking on a vendor dependency for it now.
 * `type` stays a free-text column rather than a DB enum: the event taxonomy
 * (`@food-ai/analytics`'s `AnalyticsEventType`) is expected to grow every phase, and a
 * Postgres enum migration per new event name would be friction for no real benefit —
 * the TS union already gives call-site type safety. */
export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    // Small, non-sensitive aggregates only — never full meal text/photo (master prompt
    // §28), enforced at the TS boundary by `AnalyticsEvent.properties`'s value types.
    properties: jsonb("properties").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("analytics_events_user_id_created_at_idx").on(table.userId, table.createdAt)],
);
