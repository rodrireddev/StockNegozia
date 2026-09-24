import { Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import type {
  CreditLedgerEntryDto,
  EntitlementCatalogItemDto,
  EntitlementDto,
  PurchaseEntitlementResult,
} from "@stocknegozia/api-contracts";
import { AccountJwtGuard, type RequestWithAccount } from "../accounts/account-jwt.guard";
import { CreditsService } from "./credits.service";
import { EntitlementsService } from "./entitlements.service";

@Controller("credits/me")
@UseGuards(AccountJwtGuard)
export class CreditsController {
  constructor(
    @Inject(CreditsService) private readonly creditsService: CreditsService,
    @Inject(EntitlementsService) private readonly entitlementsService: EntitlementsService,
  ) {}

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

  @Get("entitlements")
  listEntitlements(@Req() request: RequestWithAccount): Promise<EntitlementDto[]> {
    return this.entitlementsService.listForUser(request.account!.id);
  }

  /** Catálogo para la pantalla de compra — costo actual + estado de cada entitlement. */
  @Get("entitlements/catalog")
  listEntitlementsCatalog(@Req() request: RequestWithAccount): Promise<EntitlementCatalogItemDto[]> {
    return this.entitlementsService.listCatalogForUser(request.account!.id);
  }

  /** Backup en la nube / sacarse ads (doc §1) — 30 días, se renueva extendiendo el vencimiento. */
  @Post("entitlements/:type/purchase")
  purchaseEntitlement(
    @Param("type") type: string,
    @Req() request: RequestWithAccount,
  ): Promise<PurchaseEntitlementResult> {
    return this.entitlementsService.purchase(request.account!.id, type);
  }
}
