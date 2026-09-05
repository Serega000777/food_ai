import {
  createMealSchema,
  updateMealSchema,
  type CreateMealInput,
  type MealEntryDto,
  type UpdateMealInput,
} from "@food-ai/contracts";
import {
  Body,
  Controller,
  Delete,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";

import { CurrentUser } from "../../common/current-user.decorator";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/authenticated-request";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

import { MealsService } from "./meals.service";

@Controller("meals")
@UseGuards(JwtAuthGuard)
export class MealsController {
  constructor(private readonly meals: MealsService) {}

  @HttpCode(HttpStatus.CREATED)
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createMealSchema)) body: CreateMealInput,
    @Headers("idempotency-key") idempotencyKey?: string,
  ): Promise<MealEntryDto> {
    return this.meals.create(user.id, body, idempotencyKey);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateMealSchema)) body: UpdateMealInput,
  ): Promise<MealEntryDto> {
    return this.meals.update(user.id, id, body);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(":id")
  delete(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string): Promise<void> {
    return this.meals.delete(user.id, id);
  }
}
