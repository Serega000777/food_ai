import { z } from "zod";

import { macrosSchema } from "./macros";
import { mealEntryDtoSchema } from "./meal";

export const dashboardResponseSchema = z.object({
  date: z.string(),
  target: macrosSchema,
  consumed: macrosSchema,
  remaining: macrosSchema,
  meals: z.array(mealEntryDtoSchema),
});
export type DashboardResponse = z.infer<typeof dashboardResponseSchema>;

export const dashboardQuerySchema = z.object({
  date: z.string().date().optional(),
});
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
