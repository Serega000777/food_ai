import { pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { mealEntries } from "./meal-entries";
import { users } from "./users";

/** Generic per-user idempotency record for retry-prone create endpoints (technical
 * spec §24, AT-015) — currently only `POST /v1/meals` uses it; a `resourceType`
 * column would only make sense once a second endpoint actually needs one. */
export const idempotencyKeys = pgTable(
  "idempotency_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    mealEntryId: uuid("meal_entry_id")
      .notNull()
      .references(() => mealEntries.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("idempotency_keys_user_id_key_unique").on(table.userId, table.key)],
);
