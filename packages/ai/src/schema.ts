import { z } from "zod";

// The runtime check a `VisionProvider` response must pass before anything downstream
// trusts it (ADR 0005) — a malformed response fails here, not deep inside matching/DB
// writes (master prompt AT-010: "Invalid AI structured response → graceful analysis
// failure, не corrupt meal").
export const mealVisionItemSchema = z.object({
  label: z.string().min(1),
  estimatedGrams: z.number().positive(),
  gramRange: z.tuple([z.number().nonnegative(), z.number().nonnegative()]),
  confidence: z.number().min(0).max(1),
  hiddenCalorieRisk: z.boolean().optional(),
});

export const mealVisionResultSchema = z.object({
  schemaVersion: z.string().min(1),
  dishName: z.string().optional(),
  items: z.array(mealVisionItemSchema).min(1),
  overallConfidence: z.number().min(0).max(1),
});

export type MealVisionItem = z.infer<typeof mealVisionItemSchema>;
export type MealVisionResult = z.infer<typeof mealVisionResultSchema>;

/** Throws a plain `Error` (never a raw ZodError leaking to a client) with a message
 * safe to log — callers decide how to surface that as ANALYSIS_FAILED. */
export function parseMealVisionResult(raw: unknown): MealVisionResult {
  const result = mealVisionResultSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid VisionProvider response: ${result.error.message}`);
  }
  return result.data;
}
