import type {
  LogWeightInput,
  ProgressRangeDays,
  ProgressResponse,
  WeightLogDto,
  WeightTrend,
} from "@food-ai/contracts";
import { averageMacros, type Macros } from "@food-ai/nutrition";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, eq, gte, lt } from "drizzle-orm";

import {
  localDayRangeUtc,
  localTodayDateStr,
  shiftDateStr,
  toLocalDateStr,
} from "../../common/local-day";
import type { Database } from "../../db/client";
import { DATABASE } from "../../db/database.token";
import { firstOrThrow } from "../../db/first-or-throw";
import { mealEntries, users, weightLogs } from "../../db/schema";
import { AnalyticsService } from "../analytics/analytics.service";

type WeightLogRow = typeof weightLogs.$inferSelect;
type MealEntryRow = typeof mealEntries.$inferSelect;

function toWeightLogDto(row: WeightLogRow): WeightLogDto {
  return {
    id: row.id,
    weightKg: Number(row.weightKg),
    measuredAt: row.measuredAt.toISOString(),
    source: row.source,
  };
}

function entryMacros(entry: MealEntryRow): Macros {
  return {
    calories: Number(entry.totalCalories),
    proteinG: Number(entry.proteinG),
    fatG: Number(entry.fatG),
    carbsG: Number(entry.carbsG),
  };
}

@Injectable()
export class ProgressService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly analytics: AnalyticsService,
  ) {}

  private async requireUser(userId: string) {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  /** "Add/edit" (master prompt §20) as one upsert-by-local-day, not a separate PATCH
   * endpoint: re-logging weight on a day that already has an entry (onboarding's
   * initial measurement included) corrects it in place rather than cluttering the
   * trend with two points for one day. */
  async logWeight(userId: string, input: LogWeightInput): Promise<WeightLogDto> {
    const user = await this.requireUser(userId);
    const measuredAt = input.measuredAt ? new Date(input.measuredAt) : new Date();
    const { start, end } = localDayRangeUtc(
      toLocalDateStr(measuredAt, user.timezone),
      user.timezone,
    );

    const [existing] = await this.db
      .select()
      .from(weightLogs)
      .where(
        and(
          eq(weightLogs.userId, userId),
          gte(weightLogs.measuredAt, start),
          lt(weightLogs.measuredAt, end),
        ),
      );

    const row = existing
      ? firstOrThrow(
          await this.db
            .update(weightLogs)
            .set({ weightKg: input.weightKg.toString(), measuredAt, source: "MANUAL" })
            .where(eq(weightLogs.id, existing.id))
            .returning(),
        )
      : firstOrThrow(
          await this.db
            .insert(weightLogs)
            .values({ userId, weightKg: input.weightKg.toString(), measuredAt, source: "MANUAL" })
            .returning(),
        );

    return toWeightLogDto(row);
  }

  async getProgress(userId: string, range: ProgressRangeDays): Promise<ProgressResponse> {
    const user = await this.requireUser(userId);
    const todayStr = localTodayDateStr(user.timezone);
    const start = localDayRangeUtc(shiftDateStr(todayStr, -(range - 1)), user.timezone).start;
    const end = localDayRangeUtc(todayStr, user.timezone).end;

    const weightRows = await this.db
      .select()
      .from(weightLogs)
      .where(
        and(
          eq(weightLogs.userId, userId),
          gte(weightLogs.measuredAt, start),
          lt(weightLogs.measuredAt, end),
        ),
      )
      .orderBy(asc(weightLogs.measuredAt));

    const firstWeight = weightRows[0];
    const lastWeight = weightRows[weightRows.length - 1];
    const weightTrend: WeightTrend =
      firstWeight && lastWeight
        ? {
            startWeightKg: Number(firstWeight.weightKg),
            currentWeightKg: Number(lastWeight.weightKg),
            changeKg: Number(lastWeight.weightKg) - Number(firstWeight.weightKg),
          }
        : { startWeightKg: null, currentWeightKg: null, changeKg: null };

    const mealRows = await this.db
      .select()
      .from(mealEntries)
      .where(
        and(
          eq(mealEntries.userId, userId),
          gte(mealEntries.eatenAt, start),
          lt(mealEntries.eatenAt, end),
        ),
      );

    // No shame (master prompt §20): average over days actually logged, not the full
    // range — a day the user forgot to log shouldn't read as "you barely ate".
    const loggedDays = new Set(
      mealRows.map((entry) => toLocalDateStr(entry.eatenAt, user.timezone)),
    );
    const averages = averageMacros(mealRows.map(entryMacros), loggedDays.size);

    this.analytics.track(userId, { type: "progress_opened", properties: { range } });

    return {
      range,
      weightLogs: weightRows.map(toWeightLogDto),
      weightTrend,
      daysInRange: range,
      daysLogged: loggedDays.size,
      averages,
    };
  }
}
