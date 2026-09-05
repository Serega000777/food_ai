import { z } from "zod";

export const mealTypeSchema = z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK", "OTHER"]);
export type MealType = z.infer<typeof mealTypeSchema>;

export const createMealItemSchema = z.object({
  foodId: z.string().uuid(),
  grams: z.number().positive().max(5000),
});
export type CreateMealItemInput = z.infer<typeof createMealItemSchema>;

export const createMealSchema = z.object({
  mealType: mealTypeSchema,
  /** Defaults to now (server clock) if omitted. */
  eatenAt: z.string().datetime({ offset: true }).optional(),
  items: z.array(createMealItemSchema).min(1).max(50),
});
export type CreateMealInput = z.infer<typeof createMealSchema>;

/** Items, when provided, replace the meal's item list wholesale — the simplest correct
 * edit model for MVP; per-item PATCH can follow if the UI ever needs finer edits. */
export const updateMealSchema = z.object({
  mealType: mealTypeSchema.optional(),
  eatenAt: z.string().datetime({ offset: true }).optional(),
  items: z.array(createMealItemSchema).min(1).max(50).optional(),
});
export type UpdateMealInput = z.infer<typeof updateMealSchema>;

export const mealItemDtoSchema = z.object({
  id: z.string().uuid(),
  foodId: z.string().uuid().nullable(),
  displayName: z.string(),
  grams: z.number(),
  calories: z.number(),
  proteinG: z.number(),
  fatG: z.number(),
  carbsG: z.number(),
});
export type MealItemDto = z.infer<typeof mealItemDtoSchema>;

export const mealEntryDtoSchema = z.object({
  id: z.string().uuid(),
  mealType: mealTypeSchema,
  eatenAt: z.string(),
  totalCalories: z.number(),
  proteinG: z.number(),
  fatG: z.number(),
  carbsG: z.number(),
  items: z.array(mealItemDtoSchema),
});
export type MealEntryDto = z.infer<typeof mealEntryDtoSchema>;
