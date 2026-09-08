import { z } from "zod";

import { macrosSchema } from "./macros";
import { weightLogDtoSchema } from "./weight";

export const progressRangeSchema = z.enum(["7", "30", "90"]);
export type ProgressRangeDays = 7 | 30 | 90;

export const progressQuerySchema = z.object({
  range: progressRangeSchema.optional(),
});
export type ProgressQuery = z.infer<typeof progressQuerySchema>;

export const weightTrendSchema = z.object({
  startWeightKg: z.number().nullable(),
  currentWeightKg: z.number().nullable(),
  changeKg: z.number().nullable(),
});
export type WeightTrend = z.infer<typeof weightTrendSchema>;

export const progressResponseSchema = z.object({
  range: z.union([z.literal(7), z.literal(30), z.literal(90)]),
  weightLogs: z.array(weightLogDtoSchema),
  weightTrend: weightTrendSchema,
  daysInRange: z.number().int(),
  /** Distinct local calendar days with at least one logged meal — `averages` divides
   * by this, not `daysInRange`, so unlogged days don't drag the average down. */
  daysLogged: z.number().int(),
  averages: macrosSchema,
});
export type ProgressResponse = z.infer<typeof progressResponseSchema>;
