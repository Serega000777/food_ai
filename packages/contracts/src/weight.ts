import { z } from "zod";

export const weightSourceSchema = z.enum(["ONBOARDING", "MANUAL"]);
export type WeightSource = z.infer<typeof weightSourceSchema>;

export const logWeightSchema = z.object({
  weightKg: z.number().positive().max(500),
  /** Defaults to now (server clock) if omitted. */
  measuredAt: z.string().datetime({ offset: true }).optional(),
});
export type LogWeightInput = z.infer<typeof logWeightSchema>;

export const weightLogDtoSchema = z.object({
  id: z.string().uuid(),
  weightKg: z.number(),
  measuredAt: z.string(),
  source: weightSourceSchema,
});
export type WeightLogDto = z.infer<typeof weightLogDtoSchema>;
