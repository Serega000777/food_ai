import type { AnalyticsEvent } from "@food-ai/analytics";
import { Inject, Injectable, Logger } from "@nestjs/common";

import type { Database } from "../../db/client";
import { DATABASE } from "../../db/database.token";
import { analyticsEvents } from "../../db/schema";

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** Fire-and-forget by design: a product-analytics write must never fail the user
   * action it's attached to (confirming a meal, opening the diary). Errors are logged,
   * not thrown or awaited by the caller. */
  track(userId: string, event: AnalyticsEvent): void {
    this.db
      .insert(analyticsEvents)
      .values({ userId, type: event.type, properties: event.properties ?? {} })
      .catch((error: unknown) => {
        this.logger.warn(`Failed to record analytics event "${event.type}"`, error);
      });
  }
}
