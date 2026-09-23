import { Controller, Get, Inject, Query, Req, UseGuards } from "@nestjs/common";
import type { CreditLedgerEntryDto } from "@stocknegozia/api-contracts";
import { AccountJwtGuard, type RequestWithAccount } from "../accounts/account-jwt.guard";
import { CreditsService } from "./credits.service";

@Controller("credits/me")
@UseGuards(AccountJwtGuard)
export class CreditsController {
  constructor(@Inject(CreditsService) private readonly creditsService: CreditsService) {}

  @Get("balance")
  async getBalance(@Req() request: RequestWithAccount): Promise<{ balance: number }> {
    const balance = await this.creditsService.getBalance(request.account!.id);
    return { balance };
  }

  @Get("ledger")
  listLedger(
    @Req() request: RequestWithAccount,
    @Query("limit") limit?: string,
  ): Promise<CreditLedgerEntryDto[]> {
    const parsedLimit = limit ? Math.min(Number(limit) || 50, 200) : 50;
    return this.creditsService.listLedger(request.account!.id, parsedLimit);
  }
}
