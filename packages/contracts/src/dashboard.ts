import { z } from "zod";

const macrosSchema = z.object({
  calories: z.number(),
  proteinG: z.number(),
  fatG: z.number(),
  carbsG: z.number(),
});
export type Macros = z.infer<typeof macrosSchema>;

/** Meal totals (`consumed`, `meals`) are always zero/empty until Phase 3 adds
 * MealEntry — this is deliberately the "empty state" from master prompt §13. */
export const dashboardResponseSchema = z.object({
  date: z.string(),
  target: macrosSchema,
  consumed: macrosSchema,
  remaining: macrosSchema,
  meals: z.array(z.unknown()),
});
export type DashboardResponse = z.infer<typeof dashboardResponseSchema>;

export const dashboardQuerySchema = z.object({
  date: z.string().date().optional(),
});
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
