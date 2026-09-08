import { Processor, WorkerHost } from "@nestjs/bullmq";
import type { Job } from "bullmq";

import { ANALYZE_MEAL_PHOTO_QUEUE, type AnalyzeMealPhotoJobData } from "../queue/queue.constants";

import { MealAnalysesService } from "./meal-analyses.service";

/** The worker side of ADR 0012 — runs in-process (modular monolith, ADR 0001), not a
 * separately deployed `apps/worker`, until real load says otherwise. */
@Processor(ANALYZE_MEAL_PHOTO_QUEUE)
export class AnalyzeMealPhotoProcessor extends WorkerHost {
  constructor(private readonly mealAnalyses: MealAnalysesService) {
    super();
  }

  async process(job: Job<AnalyzeMealPhotoJobData>): Promise<void> {
    const maxAttempts = job.opts.attempts ?? 1;
    const isFinalAttempt = job.attemptsMade + 1 >= maxAttempts;
    await this.mealAnalyses.runAnalysis(job.data.analysisId, isFinalAttempt);
  }
}
