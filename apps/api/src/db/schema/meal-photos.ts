import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "./users";

/** Photos live only in object storage (ADR 0011) — this row is metadata only.
 * `objectKey`/`thumbnailKey` are random, never derived from telegramId or filename. */
export const mealPhotos = pgTable("meal_photos", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  objectKey: text("object_key").notNull(),
  thumbnailKey: text("thumbnail_key").notNull(),
  // Detected server-side from magic bytes at upload (never the client's declared
  // content-type) — needed so the analysis step sends the real format to a real vision
  // provider; the mock provider ignored this, which is exactly why the gap went
  // unnoticed until Gemini (ADR 0014).
  mimeType: text("mime_type").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  /** sha256 hex of the original bytes — also what the mock VisionProvider hashes to
   * pick a deterministic scenario (ADR 0013). */
  hash: text("hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
