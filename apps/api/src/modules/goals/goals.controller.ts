import {
  createGoalSchema,
  updateGoalSchema,
  type CreateGoalInput,
  type Goal,
  type UpdateGoalInput,
} from "@food-ai/contracts";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";

import { CurrentUser } from "../../common/current-user.decorator";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/authenticated-request";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

import { GoalsService } from "./goals.service";

@Controller("goals")
@UseGuards(JwtAuthGuard)
export class GoalsController {
  constructor(private readonly goals: GoalsService) {}

  @Get()
  getActive(@CurrentUser() user: AuthenticatedUser): Promise<Goal> {
    return this.goals.getActive(user.id);
  }

  @HttpCode(HttpStatus.CREATED)
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createGoalSchema)) body: CreateGoalInput,
  ): Promise<Goal> {
    return this.goals.create(user.id, body);
  }

  @Patch()
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updateGoalSchema)) body: UpdateGoalInput,
  ): Promise<Goal> {
    return this.goals.update(user.id, body);
  }
}
