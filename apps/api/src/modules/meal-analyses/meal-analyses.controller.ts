import {
  confirmAnalysisSchema,
  refineAnalysisSchema,
  type ConfirmAnalysisInput,
  type MealAnalysisResponse,
  type MealEntryDto,
  type RefineAnalysisInput,
} from "@food-ai/contracts";
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";

import { CurrentUser } from "../../common/current-user.decorator";
import { ZodValidationPipe } from "../../common/zod-validation.pipe";
import type { AuthenticatedUser } from "../auth/authenticated-request";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

import { MAX_PHOTO_BYTES } from "./image-validation";
import { MealAnalysesService } from "./meal-analyses.service";

@Controller()
export class MealAnalysesController {
  constructor(private readonly mealAnalyses: MealAnalysesService) {}

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor("photo", { limits: { fileSize: MAX_PHOTO_BYTES } }))
  @HttpCode(HttpStatus.CREATED)
  @Post("meals/photo")
  uploadPhoto(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<MealAnalysisResponse> {
    if (!file) throw new BadRequestException('Missing "photo" file in multipart body');
    return this.mealAnalyses.createFromUpload(user.id, file);
  }

  @UseGuards(JwtAuthGuard)
  @Get("meal-analyses/:id")
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ): Promise<MealAnalysisResponse> {
    return this.mealAnalyses.getById(user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post("meal-analyses/:id/refine")
  refine(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(refineAnalysisSchema)) body: RefineAnalysisInput,
  ): Promise<MealAnalysisResponse> {
    return this.mealAnalyses.refine(user.id, id, body.correctionText);
  }

  @UseGuards(JwtAuthGuard)
  @Post("meal-analyses/:id/confirm")
  confirm(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(confirmAnalysisSchema)) body: ConfirmAnalysisInput,
  ): Promise<MealEntryDto> {
    return this.mealAnalyses.confirm(user.id, id, body);
  }
}
