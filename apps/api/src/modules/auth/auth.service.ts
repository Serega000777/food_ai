import type { AuthTokens, User } from "@food-ai/contracts";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

import { isValidTimeZone } from "../../common/local-day";
import type { Env } from "../../config/env";
import { UsersService } from "../users/users.service";

import { SessionsService } from "./sessions.service";
import { verifyTelegramInitData } from "./telegram-init-data";

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly sessions: SessionsService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async loginWithTelegram(
    initData: string,
    timezone?: string,
  ): Promise<{ user: User; tokens: AuthTokens }> {
    const botToken = this.config.get("TELEGRAM_BOT_TOKEN", { infer: true });
    const result = verifyTelegramInitData(initData, botToken);

    if (!result.ok) {
      throw new UnauthorizedException(`Telegram initData rejected: ${result.reason}`);
    }

    let user = await this.users.findOrCreateByTelegramId(result.user);
    // Best-effort: an auto-detected value the client got wrong shouldn't fail login.
    if (timezone && isValidTimeZone(timezone) && timezone !== user.timezone) {
      await this.users.updateTimezone(user.id, timezone);
      user = { ...user, timezone };
    }

    const { refreshToken } = await this.sessions.issue(user.id);
    const accessToken = await this.jwt.signAsync({ sub: user.id });

    return { user, tokens: { accessToken, refreshToken } };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const rotated = await this.sessions.rotate(refreshToken);
    if (!rotated) throw new UnauthorizedException("Refresh token is invalid, expired, or revoked");

    const accessToken = await this.jwt.signAsync({ sub: rotated.userId });
    return { accessToken, refreshToken: rotated.issued.refreshToken };
  }

  logout(refreshToken: string): Promise<void> {
    return this.sessions.revoke(refreshToken);
  }
}
