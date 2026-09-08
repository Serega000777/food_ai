import type { RecentMealDto } from "@food-ai/contracts";
import { Controller, Get, UseGuards } from "@nestjs/common";

import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthenticatedUser } from "../auth/authenticated-request";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

import { MealsService } from "./meals.service";

/** A distinct top-level controller (`/v1/recent-meals`, not `/v1/meals/recent`) to
 * match the exact path master prompt §30 lists — it still delegates to `MealsService`
 * since the data lives in the same `meal_entries` table. */
@Controller("recent-meals")
@UseGuards(JwtAuthGuard)
export class RecentMealsController {
  constructor(private readonly meals: MealsService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser): Promise<RecentMealDto[]> {
    return this.meals.getRecentMeals(user.id);
  }
}
