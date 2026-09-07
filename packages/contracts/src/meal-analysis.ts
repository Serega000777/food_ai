import { z } from "zod";

import { mealTypeSchema } from "./meal";

export const analysisStatusSchema = z.enum([
  "DRAFT",
  "UPLOADING",
  "UPLOAD_FAILED",
  "QUEUED",
  "ANALYZING",
  "MATCHING",
  "NEEDS_CLARIFICATION",
  "READY_TO_CONFIRM",
  "CONFIRMED",
  "ANALYSIS_FAILED",
  "MATCH_FAILED",
  "EXPIRED",
  "CANCELLED",
]);
export type AnalysisStatus = z.infer<typeof analysisStatusSchema>;

export const confidenceDecisionSchema = z.enum([
  "ACCEPTABLE",
  "VERIFY_ITEM",
  "ASK_QUESTION",
  "MANUAL_REQUIRED",
]);
export type ConfidenceDecision = z.infer<typeof confidenceDecisionSchema>;

export const mealAnalysisItemSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  matchedFoodId: z.string().uuid().nullable(),
  grams: z.number(),
  gramRange: z.tuple([z.number(), z.number()]).nullable(),
  confidence: z.number(),
  decision: confidenceDecisionSchema,
  hiddenCalorieRisk: z.boolean(),
  calories: z.number(),
  proteinG: z.number(),
  fatG: z.number(),
  carbsG: z.number(),
});
export type MealAnalysisItem = z.infer<typeof mealAnalysisItemSchema>;

export const mealAnalysisResponseSchema = z.object({
  id: z.string().uuid(),
  status: analysisStatusSchema,
  dishName: z.string().nullable(),
  photoUrl: z.string().nullable(),
  overallConfidence: z.number().nullable(),
  items: z.array(mealAnalysisItemSchema),
  totalCalories: z.number().nullable(),
  proteinG: z.number().nullable(),
  fatG: z.number().nullable(),
  carbsG: z.number().nullable(),
  mealEntryId: z.string().uuid().nullable(),
});
export type MealAnalysisResponse = z.infer<typeof mealAnalysisResponseSchema>;

export const refineAnalysisSchema = z.object({
  correctionText: z.string().min(1).max(500),
});
export type RefineAnalysisInput = z.infer<typeof refineAnalysisSchema>;

export const confirmAnalysisSchema = z.object({
  mealType: mealTypeSchema,
  eatenAt: z.string().datetime({ offset: true }).optional(),
});
export type ConfirmAnalysisInput = z.infer<typeof confirmAnalysisSchema>;
