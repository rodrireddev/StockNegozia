import type { DailyProfitDto } from "@/features/profits/data/service";
import { profitLedgerService, type ProfitLedgerEntry } from "@/features/profits/data/ledger";
import type { ProfitFilters } from "@/features/profits/data/repository";
import type { CashAdjustmentFilters } from "@/features/cash-adjustments/data/repository";

export async function fetchProfitLedger(
  filters: ProfitFilters & CashAdjustmentFilters = {},
): Promise<ProfitLedgerEntry[]> {
  return profitLedgerService.findMany(filters);
}

export async function fetchDailyProfits(days = 7): Promise<DailyProfitDto[]> {
  return profitLedgerService.findDailySummary(days);
}
