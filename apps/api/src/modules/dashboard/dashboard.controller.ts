import {
  dashboardQuerySchema,
  type DashboardQuery,
  type DashboardResponse,
} from "@food-ai/contracts";
import { Controller, Get, Query, UseGuards } from "@nestjs/common";

import { CurrentUser } from "../../common/current-user.decorator";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/authenticated-request";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

import { DashboardService } from "./dashboard.service";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(dashboardQuerySchema)) query: DashboardQuery,
  ): Promise<DashboardResponse> {
    return this.dashboard.getDashboard(user.id, query.date ?? todayIsoDate());
  }
}
