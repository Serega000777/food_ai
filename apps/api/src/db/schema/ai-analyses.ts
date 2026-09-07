import { index, numeric, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { mealEntries } from "./meal-entries";
import { mealPhotos } from "./meal-photos";
import { users } from "./users";

/** Full state set from master prompt §9. Phase 4's synchronous-upload strategy
 * (ADR 0011) means a row is only ever created already-uploaded, so DRAFT/UPLOADING/
 * UPLOAD_FAILED are declared for schema/spec completeness but not reachable yet;
 * EXPIRED needs a cleanup job this phase doesn't add (nothing accumulates unconfirmed
 * long enough yet to matter — revisit if that changes). */
export const analysisStatusEnum = pgEnum("analysis_status", [
  "DRAFT",
  "UPLOADING",
  "UPLOAD_FAILED",
  "QUEUED",
  "ANALYZING",
  "MATCHING",
  "NEEDS_CLARIFICATION",
  "READY_TO_CONFIRM",
  "CONFIRMED",
  "ANALYSIS_FAILED",
  "MATCH_FAILED",
  "EXPIRED",
  "CANCELLED",
]);

export const aiAnalyses = pgTable(
  "ai_analyses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mealPhotoId: uuid("meal_photo_id")
      .notNull()
      .references(() => mealPhotos.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    schemaVersion: text("schema_version"),
    status: analysisStatusEnum("status").notNull().default("QUEUED"),
    dishName: text("dish_name"),
    overallConfidence: numeric("overall_confidence", { precision: 4, scale: 3 }),
    latencyMs: numeric("latency_ms", { precision: 10, scale: 0 }),
    // Sanitized failure reason for support/debugging — never a raw stack trace
    // (master prompt §36); the real stack goes to the logger, not this column.
    errorMessage: text("error_message"),
    mealEntryId: uuid("meal_entry_id").references(() => mealEntries.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("ai_analyses_user_id_idx").on(table.userId)],
);
