import type { DashboardResponse, Macros } from "@food-ai/contracts";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, isNull } from "drizzle-orm";

import type { Database } from "../../db/client";
import { DATABASE } from "../../db/database.token";
import { goals } from "../../db/schema";

const ZERO_MACROS: Macros = { calories: 0, proteinG: 0, fatG: 0, carbsG: 0 };

@Injectable()
export class DashboardService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** No MealEntry table exists until Phase 3 — `consumed`/`meals` are the deliberate
   * "empty state" (master prompt §13) until then; only the goal target is real. */
  async getDashboard(userId: string, date: string): Promise<DashboardResponse> {
    const [goal] = await this.db
      .select()
      .from(goals)
      .where(and(eq(goals.userId, userId), isNull(goals.effectiveTo)))
      .orderBy(desc(goals.effectiveFrom))
      .limit(1);

    if (!goal) throw new NotFoundException("No active goal — complete onboarding first");

    const target: Macros = {
      calories: goal.calorieTarget,
      proteinG: goal.proteinTargetG,
      fatG: goal.fatTargetG,
      carbsG: goal.carbTargetG,
    };

    return { date, target, consumed: ZERO_MACROS, remaining: target, meals: [] };
  }
}
