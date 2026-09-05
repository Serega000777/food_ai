import type { Food } from "@food-ai/contracts";
import { Inject, Injectable } from "@nestjs/common";
import { ilike } from "drizzle-orm";

import type { Database } from "../../db/client";
import { DATABASE } from "../../db/database.token";
import { foods } from "../../db/schema";

const SEARCH_RESULT_LIMIT = 20;

function toFood(row: typeof foods.$inferSelect): Food {
  return {
    id: row.id,
    canonicalName: row.canonicalName,
    caloriesPer100g: Number(row.caloriesPer100g),
    proteinPer100g: Number(row.proteinPer100g),
    fatPer100g: Number(row.fatPer100g),
    carbsPer100g: Number(row.carbsPer100g),
  };
}

@Injectable()
export class FoodsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** Plain substring search over the seeded catalog (technical spec §13 ranking —
   * "Моё → Частое → Verified DB → остальное" — applies once personal history and an
   * external provider exist, Phase 4+; today there is only one, verified source). */
  async search(query: string): Promise<Food[]> {
    const rows = await this.db
      .select()
      .from(foods)
      .where(ilike(foods.canonicalName, `%${query}%`))
      .limit(SEARCH_RESULT_LIMIT);

    return rows.map(toFood);
  }
}
