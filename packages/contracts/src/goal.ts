import { z } from "zod";

export const activityLevelSchema = z.enum(["sedentary", "light", "active", "very_active"]);
export type ActivityLevel = z.infer<typeof activityLevelSchema>;

export const goalTypeSchema = z.enum(["LOSE", "MAINTAIN", "GAIN", "TRACK"]);
export type GoalType = z.infer<typeof goalTypeSchema>;

export const goalSourceSchema = z.enum(["INITIAL_FORMULA", "USER", "ADAPTIVE"]);
export type GoalSource = z.infer<typeof goalSourceSchema>;

export const createGoalSchema = z.object({
  type: goalTypeSchema,
  currentWeightKg: z.number().positive().max(500),
  targetWeightKg: z.number().positive().max(500).optional(),
  activityLevel: activityLevelSchema,
  // Product blueprint §5.6: a comfortable-to-faster slider, e.g. 0.25 / 0.5 / 0.75 kg/week.
  paceKgPerWeek: z.number().min(0.1).max(1).optional(),
});
export type CreateGoalInput = z.infer<typeof createGoalSchema>;

/** Direct override (master prompt §12: "user can override targets later") — unlike
 * `createGoalSchema`, this never runs the initial-formula calculation; whatever is
 * provided is stored as-is, `source: "USER"`. Fields are all optional so the client can
 * send just the one thing being edited (e.g. only `targetWeightKg`); unset fields keep
 * the current active goal's value. */
export const updateGoalSchema = z.object({
  calorieTarget: z.number().int().positive().max(10_000).optional(),
  proteinTargetG: z.number().int().nonnegative().max(1000).optional(),
  fatTargetG: z.number().int().nonnegative().max(1000).optional(),
  carbTargetG: z.number().int().nonnegative().max(1000).optional(),
  targetWeightKg: z.number().positive().max(500).optional(),
});
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;

export const goalSchema = z.object({
  id: z.string().uuid(),
  type: goalTypeSchema,
  targetWeightKg: z.number().nullable(),
  paceKgPerWeek: z.number().nullable(),
  calorieTarget: z.number().int(),
  proteinTargetG: z.number().int(),
  fatTargetG: z.number().int(),
  carbTargetG: z.number().int(),
  source: goalSourceSchema,
  effectiveFrom: z.string(),
});
export type Goal = z.infer<typeof goalSchema>;
