import { Controller, Delete, HttpCode, HttpStatus, UseGuards } from "@nestjs/common";

import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthenticatedUser } from "../auth/authenticated-request";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

import { AccountService } from "./account.service";

@Controller("account")
@UseGuards(JwtAuthGuard)
export class AccountController {
  constructor(private readonly account: AccountService) {}

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete()
  delete(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.account.deleteAccount(user.id);
  }
}
