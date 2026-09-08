import { logWeightSchema, type LogWeightInput, type WeightLogDto } from "@food-ai/contracts";
import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";

import { CurrentUser } from "../../common/current-user.decorator";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/authenticated-request";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

import { ProgressService } from "./progress.service";

@Controller("weights")
@UseGuards(JwtAuthGuard)
export class WeightsController {
  constructor(private readonly progress: ProgressService) {}

  @HttpCode(HttpStatus.CREATED)
  @Post()
  log(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(logWeightSchema)) body: LogWeightInput,
  ): Promise<WeightLogDto> {
    return this.progress.logWeight(user.id, body);
  }
}
