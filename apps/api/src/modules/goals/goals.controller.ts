import { createGoalSchema, type CreateGoalInput, type Goal } from "@food-ai/contracts";
import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";

import { CurrentUser } from "../../common/current-user.decorator";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/authenticated-request";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

import { GoalsService } from "./goals.service";

@Controller("goals")
export class GoalsController {
  constructor(private readonly goals: GoalsService) {}

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createGoalSchema)) body: CreateGoalInput,
  ): Promise<Goal> {
    return this.goals.create(user.id, body);
  }
}
