import { Inject, Injectable, Logger } from "@nestjs/common";
import { eq } from "drizzle-orm";

import type { Database } from "../../db/client";
import { DATABASE } from "../../db/database.token";
import { mealPhotos, users } from "../../db/schema";
import { ObjectStorageService } from "../storage/object-storage.service";

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly storage: ObjectStorageService,
  ) {}

  /** Master prompt §26: "account deletion удаляет/очередит удаление objects". Photos
   * live only in S3 (ADR 0011) — the `users` row's cascade deletes every DB table, but
   * object storage has no such thing, so it's cleaned up explicitly, best-effort,
   * before the row goes. A storage failure here must not block the deletion the user
   * actually asked for — it's logged, not thrown. */
  async deleteAccount(userId: string): Promise<void> {
    const photos = await this.db.select().from(mealPhotos).where(eq(mealPhotos.userId, userId));

    for (const photo of photos) {
      try {
        await this.storage.deleteObject(photo.objectKey);
        await this.storage.deleteObject(photo.thumbnailKey);
      } catch (error) {
        this.logger.warn(`Failed to delete storage object for user ${userId}`, error);
      }
    }

    await this.db.delete(users).where(eq(users.id, userId));
  }
}
