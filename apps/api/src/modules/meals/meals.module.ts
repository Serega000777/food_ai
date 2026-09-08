import { Module } from "@nestjs/common";

import { MealsController } from "./meals.controller";
import { MealsService } from "./meals.service";
import { RecentMealsController } from "./recent-meals.controller";

@Module({
  controllers: [MealsController, RecentMealsController],
  providers: [MealsService],
  exports: [MealsService],
})
export class MealsModule {}
