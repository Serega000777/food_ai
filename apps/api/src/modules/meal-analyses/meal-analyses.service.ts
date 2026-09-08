import { randomUUID, createHash } from "node:crypto";

import type { PersonalContext, VisionProvider } from "@food-ai/ai";
import { parseMealVisionResult } from "@food-ai/ai";
import type {
  ConfirmAnalysisInput,
  CreateMealInput,
  MealAnalysisItem,
  MealAnalysisResponse,
  MealEntryDto,
} from "@food-ai/contracts";
import { analysisNeedsClarification } from "@food-ai/domain";
import { nutrientsForGrams, sumMacros, type Macros } from "@food-ai/nutrition";
import { InjectQueue } from "@nestjs/bullmq";
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { Queue } from "bullmq";
import { and, eq, inArray } from "drizzle-orm";
import sharp from "sharp";

import type { Database } from "../../db/client";
import { DATABASE } from "../../db/database.token";
import { firstOrThrow } from "../../db/first-or-throw";
import {
  aiAnalyses,
  aiFoodCandidates,
  corrections,
  foods,
  mealPhotos,
  userProfiles,
  users,
} from "../../db/schema";
import { VISION_PROVIDER } from "../ai/vision-provider.token";
import { AnalyticsService } from "../analytics/analytics.service";
import { MealsService } from "../meals/meals.service";
import { ANALYZE_MEAL_PHOTO_QUEUE, type AnalyzeMealPhotoJobData } from "../queue/queue.constants";
import { ObjectStorageService } from "../storage/object-storage.service";

import { validateImageBuffer } from "./image-validation";
import { matchAndDecideItems, type MatchedCandidate } from "./meal-matching";

type AiAnalysisRow = typeof aiAnalyses.$inferSelect;
type MealPhotoRow = typeof mealPhotos.$inferSelect;
type AiFoodCandidateRow = typeof aiFoodCandidates.$inferSelect;
type FoodRow = typeof foods.$inferSelect;

const THUMBNAIL_MAX_DIMENSION = 320;
const READY_FOR_ACTION_STATUSES = ["NEEDS_CLARIFICATION", "READY_TO_CONFIRM"] as const;

function toMacros(food: FoodRow): Macros {
  return {
    calories: Number(food.caloriesPer100g),
    proteinG: Number(food.proteinPer100g),
    fatG: Number(food.fatPer100g),
    carbsG: Number(food.carbsPer100g),
  };
}

function candidateInsertValues(analysisId: string, candidate: MatchedCandidate) {
  return {
    analysisId,
    label: candidate.label,
    matchedFoodId: candidate.matchedFoodId,
    estimatedGrams: candidate.estimatedGrams.toString(),
    gramRangeMin: candidate.gramRangeMin.toString(),
    gramRangeMax: candidate.gramRangeMax.toString(),
    confidence: candidate.confidence.toString(),
    hiddenCalorieRisk: candidate.hiddenCalorieRisk,
    decision: candidate.decision,
  };
}

@Injectable()
export class MealAnalysesService {
  private readonly logger = new Logger(MealAnalysesService.name);

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(VISION_PROVIDER) private readonly provider: VisionProvider,
    @InjectQueue(ANALYZE_MEAL_PHOTO_QUEUE) private readonly queue: Queue<AnalyzeMealPhotoJobData>,
    private readonly storage: ObjectStorageService,
    private readonly meals: MealsService,
    private readonly analytics: AnalyticsService,
  ) {}

  private async buildContext(userId: string): Promise<PersonalContext> {
    const [row] = await this.db
      .select({ locale: users.locale, unitSystem: userProfiles.unitSystem })
      .from(users)
      .innerJoin(userProfiles, eq(userProfiles.userId, users.id))
      .where(eq(users.id, userId));
    return { locale: row?.locale ?? "ru", unitSystem: row?.unitSystem ?? "metric" };
  }

  /** 404 (not 403) on another user's analysis — same IDOR hygiene as MealsService. */
  private async requireOwnedAnalysis(
    userId: string,
    analysisId: string,
  ): Promise<{ analysis: AiAnalysisRow; photo: MealPhotoRow }> {
    const [analysis] = await this.db
      .select()
      .from(aiAnalyses)
      .where(and(eq(aiAnalyses.id, analysisId), eq(aiAnalyses.userId, userId)));
    if (!analysis) throw new NotFoundException("Analysis not found");

    const [photo] = await this.db
      .select()
      .from(mealPhotos)
      .where(eq(mealPhotos.id, analysis.mealPhotoId));
    if (!photo) throw new Error(`Analysis ${analysisId} is missing its photo record`);

    return { analysis, photo };
  }

  private async buildResponse(
    analysis: AiAnalysisRow,
    photo: MealPhotoRow,
    candidates: AiFoodCandidateRow[],
  ): Promise<MealAnalysisResponse> {
    const photoUrl = await this.storage.getSignedDownloadUrl(photo.objectKey);

    const matchedFoodIds = candidates
      .map((candidate) => candidate.matchedFoodId)
      .filter((id): id is string => id !== null);
    const foodRows =
      matchedFoodIds.length > 0
        ? await this.db.select().from(foods).where(inArray(foods.id, matchedFoodIds))
        : [];
    const foodById = new Map(foodRows.map((food) => [food.id, food]));

    const items: MealAnalysisItem[] = candidates.map((candidate) => {
      const food = candidate.matchedFoodId ? foodById.get(candidate.matchedFoodId) : undefined;
      const macros: Macros = food
        ? nutrientsForGrams(toMacros(food), Number(candidate.estimatedGrams))
        : { calories: 0, proteinG: 0, fatG: 0, carbsG: 0 };

      return {
        id: candidate.id,
        label: candidate.label,
        matchedFoodId: candidate.matchedFoodId,
        grams: Number(candidate.estimatedGrams),
        gramRange:
          candidate.gramRangeMin !== null && candidate.gramRangeMax !== null
            ? [Number(candidate.gramRangeMin), Number(candidate.gramRangeMax)]
            : null,
        confidence: Number(candidate.confidence),
        decision: candidate.decision,
        hiddenCalorieRisk: candidate.hiddenCalorieRisk,
        calories: macros.calories,
        proteinG: macros.proteinG,
        fatG: macros.fatG,
        carbsG: macros.carbsG,
      };
    });

    const total = items.length > 0 ? sumMacros(items) : null;

    return {
      id: analysis.id,
      status: analysis.status,
      dishName: analysis.dishName,
      photoUrl,
      overallConfidence:
        analysis.overallConfidence !== null ? Number(analysis.overallConfidence) : null,
      items,
      totalCalories: total?.calories ?? null,
      proteinG: total?.proteinG ?? null,
      fatG: total?.fatG ?? null,
      carbsG: total?.carbsG ?? null,
      mealEntryId: analysis.mealEntryId,
    };
  }

  /** Validates, strips EXIF (re-encoding through sharp drops it unless `withMetadata()`
   * is called), thumbnails, uploads both to private storage, and enqueues analysis.
   * Synchronous end-to-end (ADR 0011) — by the time this returns, the upload is done;
   * only the AI step itself is queued. */
  async createFromUpload(userId: string, file: Express.Multer.File): Promise<MealAnalysisResponse> {
    const { mimeType } = validateImageBuffer(file.buffer);

    const normalized = await sharp(file.buffer).rotate().toBuffer();
    const metadata = await sharp(normalized).metadata();
    const thumbnail = await sharp(normalized)
      .resize(THUMBNAIL_MAX_DIMENSION, THUMBNAIL_MAX_DIMENSION, { fit: "inside" })
      .jpeg({ quality: 70 })
      .toBuffer();
    const hash = createHash("sha256").update(file.buffer).digest("hex");

    // Random, not derived from telegramId/filename (master prompt §10/§25).
    const objectKey = `meal-photos/${randomUUID()}`;
    const thumbnailKey = `meal-photos/${randomUUID()}-thumb.jpg`;
    await this.storage.upload(objectKey, normalized, mimeType);
    await this.storage.upload(thumbnailKey, thumbnail, "image/jpeg");

    const photo = firstOrThrow(
      await this.db
        .insert(mealPhotos)
        .values({
          userId,
          objectKey,
          thumbnailKey,
          mimeType,
          width: metadata.width ?? 0,
          height: metadata.height ?? 0,
          hash,
        })
        .returning(),
    );

    const analysis = firstOrThrow(
      await this.db
        .insert(aiAnalyses)
        .values({ userId, mealPhotoId: photo.id, provider: this.provider.name, status: "QUEUED" })
        .returning(),
    );

    await this.queue.add(ANALYZE_MEAL_PHOTO_QUEUE, { analysisId: analysis.id });

    return this.buildResponse(analysis, photo, []);
  }

  async getById(userId: string, analysisId: string): Promise<MealAnalysisResponse> {
    const { analysis, photo } = await this.requireOwnedAnalysis(userId, analysisId);
    const candidates = await this.db
      .select()
      .from(aiFoodCandidates)
      .where(eq(aiFoodCandidates.analysisId, analysisId));
    return this.buildResponse(analysis, photo, candidates);
  }

  /** Runs on the BullMQ worker (AnalyzeMealPhotoProcessor) — never called from an HTTP
   * handler directly, so provider latency never blocks a request (ADR 0012).
   * `isFinalAttempt` comes from the job's own attempt count: a real provider (Gemini)
   * can fail transiently (timeout, rate limit), so only the last retry should mark the
   * analysis ANALYSIS_FAILED in the DB — earlier failures rethrow so BullMQ retries them
   * silently, without ever showing the user a failure they didn't actually hit (ADR 0014). */
  async runAnalysis(analysisId: string, isFinalAttempt = true): Promise<void> {
    const [analysis] = await this.db.select().from(aiAnalyses).where(eq(aiAnalyses.id, analysisId));
    if (!analysis) {
      this.logger.warn(`runAnalysis: analysis ${analysisId} no longer exists, skipping`);
      return;
    }
    const [photo] = await this.db
      .select()
      .from(mealPhotos)
      .where(eq(mealPhotos.id, analysis.mealPhotoId));
    if (!photo) {
      this.logger.error(`runAnalysis: analysis ${analysisId} has no photo record`);
      return;
    }

    await this.db
      .update(aiAnalyses)
      .set({ status: "ANALYZING", updatedAt: new Date() })
      .where(eq(aiAnalyses.id, analysisId));

    const startedAt = Date.now();
    try {
      const imageBuffer = await this.storage.getObjectBuffer(photo.objectKey);
      const context = await this.buildContext(analysis.userId);
      const rawResult = await this.provider.analyzeMeal(
        { buffer: imageBuffer, mimeType: photo.mimeType },
        context,
      );
      // Never trusts a provider's output without validating it first (ADR 0005,
      // AT-010) — a malformed response is caught here, not deep in a DB write.
      const result = parseMealVisionResult(rawResult);

      await this.db
        .update(aiAnalyses)
        .set({ status: "MATCHING", updatedAt: new Date() })
        .where(eq(aiAnalyses.id, analysisId));

      const matched = await matchAndDecideItems(this.db, result.items);
      await this.db
        .insert(aiFoodCandidates)
        .values(matched.map((candidate) => candidateInsertValues(analysisId, candidate)));

      const needsClarification = analysisNeedsClarification(matched.map((m) => m.decision));
      await this.db
        .update(aiAnalyses)
        .set({
          status: needsClarification ? "NEEDS_CLARIFICATION" : "READY_TO_CONFIRM",
          dishName: result.dishName ?? null,
          schemaVersion: result.schemaVersion,
          overallConfidence: result.overallConfidence.toString(),
          latencyMs: String(Date.now() - startedAt),
          updatedAt: new Date(),
        })
        .where(eq(aiAnalyses.id, analysisId));
    } catch (error) {
      // Full detail server-side only — the client (and this column) get a safe,
      // generic reason (master prompt §36).
      const stack = error instanceof Error ? error.stack : String(error);

      if (!isFinalAttempt) {
        this.logger.warn(`Analysis ${analysisId} failed, will retry`, stack);
        // Rethrow (not swallow) so BullMQ registers the attempt as failed and retries
        // it with backoff — leaving status at ANALYZING is fine, the next attempt
        // overwrites it either way.
        throw error;
      }

      this.logger.error(`Analysis ${analysisId} failed on final attempt`, stack);
      await this.db
        .update(aiAnalyses)
        .set({
          status: "ANALYSIS_FAILED",
          errorMessage: "Не удалось проанализировать фото",
          updatedAt: new Date(),
        })
        .where(eq(aiAnalyses.id, analysisId));
    }
  }

  async refine(
    userId: string,
    analysisId: string,
    correctionText: string,
  ): Promise<MealAnalysisResponse> {
    const { analysis, photo } = await this.requireOwnedAnalysis(userId, analysisId);
    if (
      !READY_FOR_ACTION_STATUSES.includes(
        analysis.status as (typeof READY_FOR_ACTION_STATUSES)[number],
      )
    ) {
      throw new BadRequestException("Analysis is not in a refinable state");
    }

    const previousCandidates = await this.db
      .select()
      .from(aiFoodCandidates)
      .where(eq(aiFoodCandidates.analysisId, analysisId));

    const previousResult = {
      schemaVersion: analysis.schemaVersion ?? "mock-v1",
      dishName: analysis.dishName ?? undefined,
      items: previousCandidates.map((candidate) => ({
        label: candidate.label,
        estimatedGrams: Number(candidate.estimatedGrams),
        gramRange: [
          Number(candidate.gramRangeMin ?? candidate.estimatedGrams),
          Number(candidate.gramRangeMax ?? candidate.estimatedGrams),
        ] as [number, number],
        confidence: Number(candidate.confidence),
        hiddenCalorieRisk: candidate.hiddenCalorieRisk,
      })),
      overallConfidence:
        analysis.overallConfidence !== null ? Number(analysis.overallConfidence) : 0.5,
    };

    const context = await this.buildContext(userId);
    const rawRefined = await this.provider.refineMeal({ previousResult, correctionText }, context);
    const refined = parseMealVisionResult(rawRefined);
    const matched = await matchAndDecideItems(this.db, refined.items);

    const result = await this.db.transaction(async (tx) => {
      // Before/after preserved, never overwritten in place (master prompt §16, AT-012).
      await tx.insert(corrections).values({
        userId,
        analysisId,
        type: "TEXT_REFINEMENT",
        before: previousCandidates,
        after: matched,
      });

      await tx.delete(aiFoodCandidates).where(eq(aiFoodCandidates.analysisId, analysisId));
      const insertedCandidates = await tx
        .insert(aiFoodCandidates)
        .values(matched.map((candidate) => candidateInsertValues(analysisId, candidate)))
        .returning();

      const needsClarification = analysisNeedsClarification(matched.map((m) => m.decision));
      const updatedAnalysis = firstOrThrow(
        await tx
          .update(aiAnalyses)
          .set({
            status: needsClarification ? "NEEDS_CLARIFICATION" : "READY_TO_CONFIRM",
            dishName: refined.dishName ?? analysis.dishName,
            overallConfidence: refined.overallConfidence.toString(),
            updatedAt: new Date(),
          })
          .where(eq(aiAnalyses.id, analysisId))
          .returning(),
      );

      return this.buildResponse(updatedAnalysis, photo, insertedCandidates);
    });

    // Type only — never the free-text correctionText itself (master prompt §28: no
    // full meal text/photo in analytics).
    this.analytics.track(userId, { type: "meal_corrected", properties: { analysisId } });
    return result;
  }

  /** Idempotent — confirming an already-confirmed analysis returns the existing meal
   * instead of creating a second one (AT-004's principle, applied to the photo flow). */
  async confirm(
    userId: string,
    analysisId: string,
    input: ConfirmAnalysisInput,
  ): Promise<MealEntryDto> {
    const { analysis } = await this.requireOwnedAnalysis(userId, analysisId);

    if (analysis.status === "CONFIRMED") {
      if (!analysis.mealEntryId) {
        throw new Error(`Analysis ${analysisId} is CONFIRMED but has no mealEntryId`);
      }
      return this.meals.getById(userId, analysis.mealEntryId);
    }

    if (
      !READY_FOR_ACTION_STATUSES.includes(
        analysis.status as (typeof READY_FOR_ACTION_STATUSES)[number],
      )
    ) {
      throw new BadRequestException("Analysis is not ready to confirm yet");
    }

    const candidates = await this.db
      .select()
      .from(aiFoodCandidates)
      .where(eq(aiFoodCandidates.analysisId, analysisId));

    const unmatched = candidates.filter((candidate) => !candidate.matchedFoodId);
    if (unmatched.length > 0) {
      throw new BadRequestException(
        `Some items aren't in our catalog yet: ${unmatched.map((c) => c.label).join(", ")}`,
      );
    }

    const mealInput: CreateMealInput = {
      mealType: input.mealType,
      eatenAt: input.eatenAt,
      items: candidates.map((candidate) => ({
        // Safe: every candidate was just confirmed matched above.
        foodId: candidate.matchedFoodId as string,
        grams: Number(candidate.estimatedGrams),
      })),
    };

    const meal = await this.meals.create(userId, mealInput, undefined, "PHOTO");

    await this.db
      .update(aiAnalyses)
      .set({ status: "CONFIRMED", mealEntryId: meal.id, updatedAt: new Date() })
      .where(eq(aiAnalyses.id, analysisId));

    return meal;
  }
}
