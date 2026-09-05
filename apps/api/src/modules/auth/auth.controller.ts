import {
  refreshSchema,
  telegramAuthSchema,
  type AuthTokens,
  type RefreshInput,
  type TelegramAuthInput,
  type User,
} from "@food-ai/contracts";
import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";

import { ZodValidationPipe } from "../../common/zod-validation.pipe";

import { AuthService } from "./auth.service";

// Auth is a prime abuse/enumeration target — tighter than the app-wide default limit.
const AUTH_THROTTLE = { default: { limit: 20, ttl: 60_000 } };

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @Post("telegram")
  async telegram(
    @Body(new ZodValidationPipe(telegramAuthSchema)) body: TelegramAuthInput,
  ): Promise<{ user: User } & AuthTokens> {
    const { user, tokens } = await this.auth.loginWithTelegram(body.initData);
    return { user, ...tokens };
  }

  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @Post("refresh")
  refresh(@Body(new ZodValidationPipe(refreshSchema)) body: RefreshInput): Promise<AuthTokens> {
    return this.auth.refresh(body.refreshToken);
  }

  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post("logout")
  logout(@Body(new ZodValidationPipe(refreshSchema)) body: RefreshInput): Promise<void> {
    return this.auth.logout(body.refreshToken);
  }
}
