import type { MeResponse, UpdateProfileInput, User, UserProfile } from "@food-ai/contracts";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";

import type { Database } from "../../db/client";
import { DATABASE } from "../../db/database.token";
import { firstOrThrow } from "../../db/first-or-throw";
import { userProfiles, users } from "../../db/schema";
import type { TelegramInitDataUser } from "../auth/telegram-init-data";

function toUser(row: typeof users.$inferSelect): User {
  return {
    id: row.id,
    locale: row.locale,
    timezone: row.timezone,
    status: row.status,
  };
}

function toProfile(row: typeof userProfiles.$inferSelect): UserProfile {
  return {
    birthDate: row.birthDate,
    sex: row.sex,
    heightCm: row.heightCm,
    unitSystem: row.unitSystem,
  };
}

@Injectable()
export class UsersService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** Finds the user for this Telegram identity, or creates the user + an empty profile
   * (filled in by onboarding, Phase 2) in one transaction. */
  async findOrCreateByTelegramId(telegramUser: TelegramInitDataUser): Promise<User> {
    const telegramId = BigInt(telegramUser.id);

    const [existing] = await this.db.select().from(users).where(eq(users.telegramId, telegramId));
    if (existing) return toUser(existing);

    return this.db.transaction(async (tx) => {
      const createdUser = firstOrThrow(
        await tx
          .insert(users)
          .values({
            telegramId,
            locale: telegramUser.language_code?.startsWith("ru") ? "ru" : "en",
          })
          .returning(),
      );

      await tx.insert(userProfiles).values({ userId: createdUser.id });

      return toUser(createdUser);
    });
  }

  async getMe(userId: string): Promise<MeResponse> {
    const [row] = await this.db
      .select({ user: users, profile: userProfiles })
      .from(users)
      .innerJoin(userProfiles, eq(userProfiles.userId, users.id))
      .where(eq(users.id, userId));

    if (!row) throw new NotFoundException("User not found");
    return { user: toUser(row.user), profile: toProfile(row.profile) };
  }

  /** Partial update — onboarding autosaves one field/screen at a time. */
  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserProfile> {
    const [row] = await this.db
      .update(userProfiles)
      .set(input)
      .where(eq(userProfiles.userId, userId))
      .returning();

    if (!row) throw new NotFoundException("User not found");
    return toProfile(row);
  }
}
