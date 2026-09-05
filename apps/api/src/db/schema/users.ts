import { bigint, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const userStatusEnum = pgEnum("user_status", ["active", "suspended", "deleted"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  // Telegram user ids can exceed the safe range of a JS number — stored/compared as
  // bigint end-to-end (technical spec §9: "telegram user id хранить в безопасном для
  // его размера типе").
  telegramId: bigint("telegram_id", { mode: "bigint" }).notNull().unique(),
  locale: text("locale").notNull().default("ru"),
  timezone: text("timezone").notNull().default("UTC"),
  status: userStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
