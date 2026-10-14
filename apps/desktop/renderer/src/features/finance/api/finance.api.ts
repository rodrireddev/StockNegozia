import type {
  CashAdjustmentDto,
  FinanceSummaryDto,
  ProfitEntryDto,
  PurchaseSummaryDto,
  SettlementDto,
  TopProductDto,
} from "@stocknegozia/api-contracts";
import { apiGet } from "@/lib/api-client";

export interface FinanceRange {
  from: Date;
  to: Date;
}

function rangeQuery(range: Partial<FinanceRange>, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams(extra);
  if (range.from) params.set("from", range.from.toISOString());
  if (range.to) params.set("to", range.to.toISOString());
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function fetchFinanceSummary(range: FinanceRange): Promise<FinanceSummaryDto> {
  return apiGet(`/finance/summary${rangeQuery(range)}`);
}

export function fetchTopProducts(range: FinanceRange, limit = 10): Promise<TopProductDto[]> {
  return apiGet(`/finance/top-products${rangeQuery(range, { limit: String(limit) })}`);
}

export function fetchSettlements(
  status: "pending" | "settled" | "all",
  range: Partial<FinanceRange> = {},
): Promise<SettlementDto[]> {
  return apiGet(`/finance/settlements${rangeQuery(range, { status })}`);
}

/** Líneas de venta (sólo ventas, sin ajustes de caja) del período. */
export function fetchSaleLines(range: FinanceRange): Promise<ProfitEntryDto[]> {
  return apiGet(`/profits${rangeQuery(range)}`);
}

export function fetchPurchasesInRange(range: FinanceRange): Promise<PurchaseSummaryDto[]> {
  return apiGet(`/purchases${rangeQuery(range)}`);
}

export function fetchCashAdjustmentsInRange(range: FinanceRange): Promise<CashAdjustmentDto[]> {
  return apiGet(`/cash-adjustments${rangeQuery(range)}`);
}
