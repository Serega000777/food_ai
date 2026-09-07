import type {
  CreateMealInput,
  MealEntryDto,
  MealItemDto,
  UpdateMealInput,
} from "@food-ai/contracts";
import { nutrientsForGrams, sumMacros, type Macros } from "@food-ai/nutrition";
import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, inArray } from "drizzle-orm";

import type { Database } from "../../db/client";
import { DATABASE } from "../../db/database.token";
import { firstOrThrow } from "../../db/first-or-throw";
import { foods, idempotencyKeys, mealEntries, mealItems } from "../../db/schema";

type FoodRow = typeof foods.$inferSelect;
type MealEntryRow = typeof mealEntries.$inferSelect;
type MealItemRow = typeof mealItems.$inferSelect;

/** Unlike `firstOrThrow` (guards an empty array), this narrows a `Map.get()` result —
 * safe here only because `resolveFoods` already rejected any id missing from the map. */
function mustGet<T>(map: Map<string, T>, key: string): T {
  const value = map.get(key);
  if (value === undefined) throw new Error(`Expected map to contain key "${key}"`);
  return value;
}

function toMacros(food: FoodRow): Macros {
  return {
    calories: Number(food.caloriesPer100g),
    proteinG: Number(food.proteinPer100g),
    fatG: Number(food.fatPer100g),
    carbsG: Number(food.carbsPer100g),
  };
}

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

function macrosToColumns(macros: Macros) {
  return {
    totalCalories: macros.calories.toString(),
    proteinG: macros.proteinG.toString(),
    fatG: macros.fatG.toString(),
    carbsG: macros.carbsG.toString(),
  };
}

@Injectable()
export class MealsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** Resolves and validates every referenced food up front — never inserts a meal item
   * whose grams/calories can't actually be computed server-side (master prompt §6:
   * nutrition values are always server-computed, never client-supplied). */
  private async resolveFoods(db: Database, foodIds: string[]): Promise<Map<string, FoodRow>> {
    const rows = await db.select().from(foods).where(inArray(foods.id, foodIds));
    const byId = new Map(rows.map((row) => [row.id, row]));
    const missing = foodIds.filter((id) => !byId.has(id));
    if (missing.length > 0) {
      throw new BadRequestException(`Unknown food id(s): ${missing.join(", ")}`);
    }
    return byId;
  }

  private buildItemSnapshots(
    items: Array<{ foodId: string; grams: number }>,
    foodById: Map<string, FoodRow>,
  ) {
    return items.map((item) => {
      const food = mustGet(foodById, item.foodId);
      return {
        foodId: food.id,
        displayName: food.canonicalName,
        grams: item.grams,
        macros: nutrientsForGrams(toMacros(food), item.grams),
      };
    });
  }

  private async findByIdempotencyKey(userId: string, key: string): Promise<MealEntryDto | null> {
    const [record] = await this.db
      .select()
      .from(idempotencyKeys)
      .where(and(eq(idempotencyKeys.userId, userId), eq(idempotencyKeys.key, key)));
    if (!record) return null;

    const [entry] = await this.db
      .select()
      .from(mealEntries)
      .where(eq(mealEntries.id, record.mealEntryId));
    if (!entry) return null; // cascade should prevent this; defensive only.

    const items = await this.db.select().from(mealItems).where(eq(mealItems.mealEntryId, entry.id));
    return toMealEntryDto(entry, items);
  }

  /** `idempotencyKey`, when the client sends one, makes a retried request return the
   * original meal instead of creating a second one (technical spec §24, AT-015).
   * `source` defaults to MANUAL; MealAnalysesService passes PHOTO when confirming an
   * AI analysis through this same, already-correct nutrition-computation path. */
  async create(
    userId: string,
    input: CreateMealInput,
    idempotencyKey?: string,
    source: "MANUAL" | "PHOTO" = "MANUAL",
  ): Promise<MealEntryDto> {
    if (idempotencyKey) {
      const existing = await this.findByIdempotencyKey(userId, idempotencyKey);
      if (existing) return existing;
    }

    const foodIds = input.items.map((item) => item.foodId);
    const foodById = await this.resolveFoods(this.db, foodIds);
    const itemSnapshots = this.buildItemSnapshots(input.items, foodById);
    const total = sumMacros(itemSnapshots.map((s) => s.macros));
    const eatenAt = input.eatenAt ? new Date(input.eatenAt) : new Date();

    return this.db.transaction(async (tx) => {
      const entry = firstOrThrow(
        await tx
          .insert(mealEntries)
          .values({
            userId,
            mealType: input.mealType,
            eatenAt,
            source,
            ...macrosToColumns(total),
          })
          .returning(),
      );

      const insertedItems = await tx
        .insert(mealItems)
        .values(
          itemSnapshots.map((snapshot) => ({
            mealEntryId: entry.id,
            foodId: snapshot.foodId,
            displayName: snapshot.displayName,
            grams: snapshot.grams.toString(),
            caloriesSnapshot: snapshot.macros.calories.toString(),
            proteinGSnapshot: snapshot.macros.proteinG.toString(),
            fatGSnapshot: snapshot.macros.fatG.toString(),
            carbsGSnapshot: snapshot.macros.carbsG.toString(),
          })),
        )
        .returning();

      if (!idempotencyKey) return toMealEntryDto(entry, insertedItems);

      const claimed = await tx
        .insert(idempotencyKeys)
        .values({ userId, key: idempotencyKey, mealEntryId: entry.id })
        .onConflictDoNothing({ target: [idempotencyKeys.userId, idempotencyKeys.key] })
        .returning();

      if (claimed.length > 0) return toMealEntryDto(entry, insertedItems);

      // Lost a race against a concurrent identical request — the winner's meal is the
      // one the key now points to; discard the meal this call just created.
      await tx.delete(mealEntries).where(eq(mealEntries.id, entry.id)); // cascades items
      const winnerKey = firstOrThrow(
        await tx
          .select()
          .from(idempotencyKeys)
          .where(and(eq(idempotencyKeys.userId, userId), eq(idempotencyKeys.key, idempotencyKey))),
      );
      const winnerEntry = firstOrThrow(
        await tx.select().from(mealEntries).where(eq(mealEntries.id, winnerKey.mealEntryId)),
      );
      const winnerItems = await tx
        .select()
        .from(mealItems)
        .where(eq(mealItems.mealEntryId, winnerEntry.id));
      return toMealEntryDto(winnerEntry, winnerItems);
    });
  }

  async getById(userId: string, mealId: string): Promise<MealEntryDto> {
    const entry = await this.requireOwnedEntry(userId, mealId);
    const items = await this.db.select().from(mealItems).where(eq(mealItems.mealEntryId, mealId));
    return toMealEntryDto(entry, items);
  }

  /** 404 (not 403) on a meal owned by another user — never confirm existence of
   * another user's resource to an unauthorized caller (IDOR hygiene). */
  private async requireOwnedEntry(userId: string, mealId: string): Promise<MealEntryRow> {
    const [entry] = await this.db
      .select()
      .from(mealEntries)
      .where(and(eq(mealEntries.id, mealId), eq(mealEntries.userId, userId)));
    if (!entry) throw new NotFoundException("Meal not found");
    return entry;
  }

  async update(userId: string, mealId: string, input: UpdateMealInput): Promise<MealEntryDto> {
    const entry = await this.requireOwnedEntry(userId, mealId);

    const foodById = input.items
      ? await this.resolveFoods(
          this.db,
          input.items.map((item) => item.foodId),
        )
      : null;

    return this.db.transaction(async (tx) => {
      let items = await tx.select().from(mealItems).where(eq(mealItems.mealEntryId, mealId));
      let total: Macros = {
        calories: Number(entry.totalCalories),
        proteinG: Number(entry.proteinG),
        fatG: Number(entry.fatG),
        carbsG: Number(entry.carbsG),
      };

      if (input.items && foodById) {
        const itemSnapshots = this.buildItemSnapshots(input.items, foodById);
        total = sumMacros(itemSnapshots.map((s) => s.macros));

        await tx.delete(mealItems).where(eq(mealItems.mealEntryId, mealId));
        items = await tx
          .insert(mealItems)
          .values(
            itemSnapshots.map((snapshot) => ({
              mealEntryId: mealId,
              foodId: snapshot.foodId,
              displayName: snapshot.displayName,
              grams: snapshot.grams.toString(),
              caloriesSnapshot: snapshot.macros.calories.toString(),
              proteinGSnapshot: snapshot.macros.proteinG.toString(),
              fatGSnapshot: snapshot.macros.fatG.toString(),
              carbsGSnapshot: snapshot.macros.carbsG.toString(),
            })),
          )
          .returning();
      }

      const updated = firstOrThrow(
        await tx
          .update(mealEntries)
          .set({
            mealType: input.mealType ?? entry.mealType,
            eatenAt: input.eatenAt ? new Date(input.eatenAt) : entry.eatenAt,
            ...macrosToColumns(total),
            updatedAt: new Date(),
          })
          .where(eq(mealEntries.id, mealId))
          .returning(),
      );

      return toMealEntryDto(updated, items);
    });
  }

  async delete(userId: string, mealId: string): Promise<void> {
    await this.requireOwnedEntry(userId, mealId);
    await this.db.delete(mealEntries).where(eq(mealEntries.id, mealId)); // cascades to items
  }
}
