import { z } from "zod";

export const foodSchema = z.object({
  id: z.string().uuid(),
  canonicalName: z.string(),
  caloriesPer100g: z.number(),
  proteinPer100g: z.number(),
  fatPer100g: z.number(),
  carbsPer100g: z.number(),
});
export type Food = z.infer<typeof foodSchema>;

export const foodSearchQuerySchema = z.object({
  q: z.string().min(1).max(100),
});
export type FoodSearchQuery = z.infer<typeof foodSearchQuerySchema>;
