import type { CreateGoalInput, Goal, UpdateGoalInput } from "@food-ai/contracts";
import { calculateInitialGoal } from "@food-ai/domain";
import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq, isNull } from "drizzle-orm";

import type { Database } from "../../db/client";
import { DATABASE } from "../../db/database.token";
import { firstOrThrow } from "../../db/first-or-throw";
import { goals, userProfiles, weightLogs } from "../../db/schema";

function toGoal(row: typeof goals.$inferSelect): Goal {
  return {
    id: row.id,
    type: row.type,
    targetWeightKg: row.targetWeightKg === null ? null : Number(row.targetWeightKg),
    paceKgPerWeek: row.paceKgPerWeek === null ? null : Number(row.paceKgPerWeek),
    calorieTarget: row.calorieTarget,
    proteinTargetG: row.proteinTargetG,
    fatTargetG: row.fatTargetG,
    carbTargetG: row.carbTargetG,
    source: row.source,
    effectiveFrom: row.effectiveFrom.toISOString(),
  };
}

@Injectable()
export class GoalsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** Records the onboarding weight measurement and computes+persists the initial goal
   * from the formula in packages/domain — never trusts a client-computed calorie value
   * (master prompt §6: nutrition/target values are always server-computed). */
  async create(userId: string, input: CreateGoalInput): Promise<Goal> {
    const [profile] = await this.db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    if (!profile) throw new NotFoundException("User not found");
    if (!profile.birthDate || !profile.sex || !profile.heightCm) {
      throw new BadRequestException(
        "Complete birth date, sex, and height (PATCH /v1/me/profile) before setting a goal",
      );
    }

    const formula = calculateInitialGoal({
      sex: profile.sex,
      birthDate: profile.birthDate,
      heightCm: profile.heightCm,
      currentWeightKg: input.currentWeightKg,
      activityLevel: input.activityLevel,
      goalType: input.type,
      paceKgPerWeek: input.paceKgPerWeek,
    });

    return this.db.transaction(async (tx) => {
      const now = new Date();

      await tx.insert(weightLogs).values({
        userId,
        weightKg: input.currentWeightKg.toString(),
        measuredAt: now,
        source: "ONBOARDING",
      });

      // Re-running onboarding (or a later manual goal change) supersedes the previous
      // goal rather than leaving two simultaneously "active" rows.
      await tx
        .update(goals)
        .set({ effectiveTo: now })
        .where(and(eq(goals.userId, userId), isNull(goals.effectiveTo)));

      const created = firstOrThrow(
        await tx
          .insert(goals)
          .values({
            userId,
            type: input.type,
            targetWeightKg: input.targetWeightKg?.toString(),
            paceKgPerWeek: (input.paceKgPerWeek ?? 0.5).toString(),
            calorieTarget: formula.calorieTarget,
            proteinTargetG: formula.proteinTargetG,
            fatTargetG: formula.fatTargetG,
            carbTargetG: formula.carbTargetG,
            source: "INITIAL_FORMULA",
            effectiveFrom: now,
          })
          .returning(),
      );

      return toGoal(created);
    });
  }

  private async getActiveRow(userId: string) {
    const [active] = await this.db
      .select()
      .from(goals)
      .where(and(eq(goals.userId, userId), isNull(goals.effectiveTo)))
      .orderBy(desc(goals.effectiveFrom))
      .limit(1);
    return active ?? null;
  }

  async getActive(userId: string): Promise<Goal> {
    const active = await this.getActiveRow(userId);
    if (!active) throw new NotFoundException("No active goal — complete onboarding first");
    return toGoal(active);
  }

  /** Direct override (master prompt §12) — never runs the initial-formula calculation;
   * unset fields keep the current active goal's value. Closes out the active goal and
   * inserts a new one, same pattern as `create()`, so history stays intact. */
  async update(userId: string, input: UpdateGoalInput): Promise<Goal> {
    const active = await this.getActiveRow(userId);
    if (!active) throw new NotFoundException("No active goal — complete onboarding first");

    return this.db.transaction(async (tx) => {
      const now = new Date();

      await tx.update(goals).set({ effectiveTo: now }).where(eq(goals.id, active.id));

      const created = firstOrThrow(
        await tx
          .insert(goals)
          .values({
            userId,
            type: active.type,
            targetWeightKg:
              input.targetWeightKg !== undefined
                ? input.targetWeightKg.toString()
                : active.targetWeightKg,
            paceKgPerWeek: active.paceKgPerWeek,
            calorieTarget: input.calorieTarget ?? active.calorieTarget,
            proteinTargetG: input.proteinTargetG ?? active.proteinTargetG,
            fatTargetG: input.fatTargetG ?? active.fatTargetG,
            carbTargetG: input.carbTargetG ?? active.carbTargetG,
            source: "USER",
            effectiveFrom: now,
          })
          .returning(),
      );

      return toGoal(created);
    });
  }
}
