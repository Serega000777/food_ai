import type { DashboardResponse, Macros } from "@food-ai/contracts";
import { subtractMacros } from "@food-ai/nutrition";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, isNull } from "drizzle-orm";

import type { Database } from "../../db/client";
import { DATABASE } from "../../db/database.token";
import { goals } from "../../db/schema";
import { DiaryService } from "../diary/diary.service";

@Injectable()
export class DashboardService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly diary: DiaryService,
  ) {}

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

    const { meals, totals: consumed } = await this.diary.getDiary(userId, date);

    return { date, target, consumed, remaining: subtractMacros(target, consumed), meals };
  }
}
