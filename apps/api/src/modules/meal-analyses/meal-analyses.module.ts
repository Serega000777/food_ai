import { Module } from "@nestjs/common";

import { MealsModule } from "../meals/meals.module";
import { QueueModule } from "../queue/queue.module";

import { AnalyzeMealPhotoProcessor } from "./analyze-meal-photo.processor";
import { MealAnalysesController } from "./meal-analyses.controller";
import { MealAnalysesService } from "./meal-analyses.service";

@Module({
  imports: [QueueModule, MealsModule],
  controllers: [MealAnalysesController],
  providers: [MealAnalysesService, AnalyzeMealPhotoProcessor],
})
export class MealAnalysesModule {}
