import { Body, Controller, Get, Inject, Post, Req, UseGuards } from "@nestjs/common";
import type { AccountAuthResult, AccountMeDto } from "@stocknegozia/api-contracts";
import {
  accountLoginSchema,
  accountRegisterSchema,
  type AccountLoginInput,
  type AccountRegisterInput,
} from "@stocknegozia/validation";
import { AccountJwtGuard, type RequestWithAccount } from "./account-jwt.guard";
import { AccountsService } from "./accounts.service";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";

@Controller("accounts")
export class AccountsController {
  constructor(@Inject(AccountsService) private readonly accountsService: AccountsService) {}

  @Post("register")
  register(
    @Body(new ZodValidationPipe(accountRegisterSchema)) body: AccountRegisterInput,
  ): Promise<AccountAuthResult> {
    return this.accountsService.register(body);
  }

  @Post("login")
  login(
    @Body(new ZodValidationPipe(accountLoginSchema)) body: AccountLoginInput,
  ): Promise<AccountAuthResult> {
    return this.accountsService.login(body.email, body.password);
  }

  @UseGuards(AccountJwtGuard)
  @Get("me")
  me(@Req() request: RequestWithAccount): Promise<AccountMeDto> {
    return this.accountsService.me(request.account!.id);
  }
}
