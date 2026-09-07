import type { MealVisionResult } from "./schema";

export interface ImageInput {
  buffer: Buffer;
  mimeType: string;
}

export interface PersonalContext {
  locale: string;
  unitSystem: "metric" | "imperial";
}

export interface RefineInput {
  previousResult: MealVisionResult;
  correctionText: string;
}

/**
 * Provider-agnostic contract (ADR 0013) — `apps/api` never imports a concrete
 * provider directly, only this interface, selected by `AI_PROVIDER_PRIMARY`. A
 * provider's raw output is always run through `parseMealVisionResult` before it's
 * trusted, so the return type here is already the validated shape.
 */
export interface VisionProvider {
  readonly name: string;
  analyzeMeal(image: ImageInput, context: PersonalContext): Promise<MealVisionResult>;
  refineMeal(input: RefineInput, context: PersonalContext): Promise<MealVisionResult>;
}
