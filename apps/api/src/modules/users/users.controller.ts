import type { MeResponse } from "@food-ai/contracts";
import { Controller, Get, UseGuards } from "@nestjs/common";

import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthenticatedUser } from "../auth/authenticated-request";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

import { UsersService } from "./users.service";

@Controller()
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@CurrentUser() user: AuthenticatedUser): Promise<MeResponse> {
    return this.users.getMe(user.id);
  }
}
