import { foodSearchQuerySchema, type Food, type FoodSearchQuery } from "@food-ai/contracts";
import { Controller, Get, Query, UseGuards } from "@nestjs/common";

import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

import { FoodsService } from "./foods.service";

@Controller("foods")
export class FoodsController {
  constructor(private readonly foods: FoodsService) {}

  @UseGuards(JwtAuthGuard)
  @Get("search")
  search(
    @Query(new ZodValidationPipe(foodSearchQuerySchema)) query: FoodSearchQuery,
  ): Promise<Food[]> {
    return this.foods.search(query.q);
  }
}
