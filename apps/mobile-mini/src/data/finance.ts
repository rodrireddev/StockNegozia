import type {
  FinanceSummaryDto,
  PurchaseSummaryDto,
  SettlementDto,
  TopProductDto,
} from "@stocknegozia/api-contracts";
import {
  cashAdjustmentsService,
  type CashAdjustmentDto,
} from "@/features/cash-adjustments/data/service";
import { profitsService, type ProfitEntryDto } from "@/features/profits/data/service";
import { purchasesService } from "@/features/purchases/data/service";
import { financeService } from "@/features/finance/data/service";

/** Fachada async — misma firma que `apps/mobile/src/api/endpoints/finance.ts` (pantallas iguales
 *  en las dos apps). */
export async function fetchFinanceSummary(range: {
  from: Date;
  to: Date;
}): Promise<FinanceSummaryDto> {
  return financeService.getSummary(range);
}

export async function fetchTopProducts(
  range: { from: Date; to: Date },
  limit = 10,
): Promise<TopProductDto[]> {
  return financeService.getTopProducts({ ...range, limit });
}

export async function fetchSettlements(
  status: "pending" | "settled" | "all",
  range: { from?: Date; to?: Date } = {},
): Promise<SettlementDto[]> {
  return financeService.getSettlements({ status, ...range });
}

export async function fetchSaleLines(range: { from: Date; to: Date }): Promise<ProfitEntryDto[]> {
  return profitsService.findMany(range);
}

export async function fetchPurchasesInRange(range: {
  from: Date;
  to: Date;
}): Promise<PurchaseSummaryDto[]> {
  return purchasesService.findMany(range);
}

export async function fetchCashAdjustmentsInRange(range: {
  from: Date;
  to: Date;
}): Promise<CashAdjustmentDto[]> {
  return cashAdjustmentsService.findMany(range);
}
