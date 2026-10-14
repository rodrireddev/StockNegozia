import type {
  CashAdjustmentDto,
  FinanceSummaryDto,
  ProfitEntryDto,
  PurchaseSummaryDto,
  SettlementDto,
  TopProductDto,
} from "@stocknegozia/api-contracts";
import { apiGet } from "@/api/client";

function rangeQuery(range: { from?: Date; to?: Date }, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams(extra);
  if (range.from) params.set("from", range.from.toISOString());
  if (range.to) params.set("to", range.to.toISOString());
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/** Misma firma que `apps/mobile-mini/src/data/finance.ts` — las pantallas de Ganancias son las
 *  mismas en las dos apps. */
export function fetchFinanceSummary(range: { from: Date; to: Date }): Promise<FinanceSummaryDto> {
  return apiGet(`/finance/summary${rangeQuery(range)}`);
}

export function fetchTopProducts(
  range: { from: Date; to: Date },
  limit = 10,
): Promise<TopProductDto[]> {
  return apiGet(`/finance/top-products${rangeQuery(range, { limit: String(limit) })}`);
}

export function fetchSettlements(
  status: "pending" | "settled" | "all",
  range: { from?: Date; to?: Date } = {},
): Promise<SettlementDto[]> {
  return apiGet(`/finance/settlements${rangeQuery(range, { status })}`);
}

export function fetchSaleLines(range: { from: Date; to: Date }): Promise<ProfitEntryDto[]> {
  return apiGet(`/profits${rangeQuery(range)}`);
}

export function fetchPurchasesInRange(range: {
  from: Date;
  to: Date;
}): Promise<PurchaseSummaryDto[]> {
  return apiGet(`/purchases${rangeQuery(range)}`);
}

export function fetchCashAdjustmentsInRange(range: {
  from: Date;
  to: Date;
}): Promise<CashAdjustmentDto[]> {
  return apiGet(`/cash-adjustments${rangeQuery(range)}`);
}
