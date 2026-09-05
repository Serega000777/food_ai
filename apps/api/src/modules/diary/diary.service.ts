import type { DiaryResponse, MealEntryDto, MealItemDto } from "@food-ai/contracts";
import { sumMacros, type Macros } from "@food-ai/nutrition";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, eq, gte, inArray, lt } from "drizzle-orm";

import { localDayRangeUtc } from "../../common/local-day";
import type { Database } from "../../db/client";
import { DATABASE } from "../../db/database.token";
import { mealEntries, mealItems, users } from "../../db/schema";

type MealEntryRow = typeof mealEntries.$inferSelect;
type MealItemRow = typeof mealItems.$inferSelect;

function toMealItemDto(row: MealItemRow): MealItemDto {
  return {
    id: row.id,
    foodId: row.foodId,
    displayName: row.displayName,
    grams: Number(row.grams),
    calories: Number(row.caloriesSnapshot),
    proteinG: Number(row.proteinGSnapshot),
    fatG: Number(row.fatGSnapshot),
    carbsG: Number(row.carbsGSnapshot),
  };
}

function toMealEntryDto(entry: MealEntryRow, items: MealItemRow[]): MealEntryDto {
  return {
    id: entry.id,
    mealType: entry.mealType,
    eatenAt: entry.eatenAt.toISOString(),
    totalCalories: Number(entry.totalCalories),
    proteinG: Number(entry.proteinG),
    fatG: Number(entry.fatG),
    carbsG: Number(entry.carbsG),
    items: items.map(toMealItemDto),
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
export class DiaryService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** Meals near midnight land in the correct *local* day (AT-009) — the range is
   * computed in the user's own timezone (captured at login), not the server's. */
  async getDiary(userId: string, date: string): Promise<DiaryResponse> {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new NotFoundException("User not found");

    const { start, end } = localDayRangeUtc(date, user.timezone);

    const entries = await this.db
      .select()
      .from(mealEntries)
      .where(
        and(
          eq(mealEntries.userId, userId),
          gte(mealEntries.eatenAt, start),
          lt(mealEntries.eatenAt, end),
        ),
      )
      .orderBy(asc(mealEntries.eatenAt));

    const items =
      entries.length === 0
        ? []
        : await this.db
            .select()
            .from(mealItems)
            .where(
              inArray(
                mealItems.mealEntryId,
                entries.map((entry) => entry.id),
              ),
            );

    const itemsByEntryId = new Map<string, MealItemRow[]>();
    for (const item of items) {
      const group = itemsByEntryId.get(item.mealEntryId) ?? [];
      group.push(item);
      itemsByEntryId.set(item.mealEntryId, group);
    }

    const meals = entries.map((entry) => toMealEntryDto(entry, itemsByEntryId.get(entry.id) ?? []));
    const totals = sumMacros(entries.map(entryMacros));

    return { date, meals, totals };
  }
}
