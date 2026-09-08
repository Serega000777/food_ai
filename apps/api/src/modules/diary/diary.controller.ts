import { diaryQuerySchema, type DiaryQuery, type DiaryResponse } from "@food-ai/contracts";
import { Controller, Get, Query, UseGuards } from "@nestjs/common";

import { CurrentUser } from "../../common/current-user.decorator";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import { AnalyticsService } from "../analytics/analytics.service";
import type { AuthenticatedUser } from "../auth/authenticated-request";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

import { DiaryService } from "./diary.service";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

@Controller("diary")
export class DiaryController {
  constructor(
    private readonly diary: DiaryService,
    private readonly analytics: AnalyticsService,
  ) {}

  // Tracked here, not in DiaryService.getDiary — DashboardService also calls that
  // method internally to build the Home screen, and a dashboard load isn't a diary_opened.
  @UseGuards(JwtAuthGuard)
  @Get()
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(diaryQuerySchema)) query: DiaryQuery,
  ): Promise<DiaryResponse> {
    this.analytics.track(user.id, { type: "diary_opened" });
    return this.diary.getDiary(user.id, query.date ?? todayIsoDate());
  }
}
