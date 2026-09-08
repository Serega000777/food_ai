import {
  progressQuerySchema,
  type ProgressQuery,
  type ProgressRangeDays,
  type ProgressResponse,
} from "@food-ai/contracts";
import { Controller, Get, Query, UseGuards } from "@nestjs/common";

import { CurrentUser } from "../../common/current-user.decorator";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/authenticated-request";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

import { ProgressService } from "./progress.service";

@Controller("progress")
@UseGuards(JwtAuthGuard)
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  @Get()
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(progressQuerySchema)) query: ProgressQuery,
  ): Promise<ProgressResponse> {
    const range = (query.range ? Number(query.range) : 30) as ProgressRangeDays;
    return this.progress.getProgress(user.id, range);
  }
}
