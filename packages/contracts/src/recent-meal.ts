import { z } from "zod";

import { mealItemDtoSchema, mealTypeSchema } from "./meal";

export const recentMealDtoSchema = z.object({
  /** The underlying `meal_entries.id` of the most recent occurrence — pass this back
   * as `sourceMealId` to `POST /v1/meals/repeat`. */
  id: z.string().uuid(),
  mealType: mealTypeSchema,
  items: z.array(mealItemDtoSchema),
  totalCalories: z.number(),
  proteinG: z.number(),
  fatG: z.number(),
  carbsG: z.number(),
  lastEatenAt: z.string(),
  /** How many past meals share this exact set of foods — lets the client show
   * "frequent" alongside "recent" without a separate query (master prompt §19). */
  timesEaten: z.number().int().positive(),
});
export type RecentMealDto = z.infer<typeof recentMealDtoSchema>;

export const repeatMealSchema = z.object({
  sourceMealId: z.string().uuid(),
  mealType: mealTypeSchema.optional(),
  /** Defaults to now (server clock) if omitted. */
  eatenAt: z.string().datetime({ offset: true }).optional(),
});
export type RepeatMealInput = z.infer<typeof repeatMealSchema>;
