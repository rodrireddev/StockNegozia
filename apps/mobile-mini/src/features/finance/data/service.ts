import type { FinanceSummaryDto, SettlementDto, TopProductDto } from "@stocknegozia/api-contracts";
import {
  buildFinanceSummary,
  buildSettlements,
  buildTopProducts,
  resolveFinancePeriod,
} from "@stocknegozia/shared";
import { cashAdjustmentsService } from "@/features/cash-adjustments/data/service";
import { financeRepository, type FinanceRange } from "./repository";

function resolveRange(range: { from?: Date; to?: Date }): FinanceRange {
  const today = resolveFinancePeriod("today");
  return { from: range.from ?? today.from, to: range.to ?? today.to };
}

/** Mismo contrato que `FinanceService` del backend (`GET /finance/*`), sobre SQLite local. */
export const financeService = {
  getSummary(query: { from?: Date; to?: Date }, now: Date = new Date()): FinanceSummaryDto {
    const range = resolveRange(query);
    return buildFinanceSummary({
      ...range,
      now,
      saleLines: financeRepository.findSaleLines(range),
      payments: financeRepository.findPayments(range),
      purchases: financeRepository.findPurchases(range),
      cashAdjustments: cashAdjustmentsService
        .findMany(range)
        .map((row) => ({ ...row, createdAt: new Date(row.createdAt) })),
      pendingPayments: financeRepository.findPendingSettlements(now),
    });
  },

  getTopProducts(query: { from?: Date; to?: Date; limit?: number }): TopProductDto[] {
    return buildTopProducts(
      financeRepository.findSaleLines(resolveRange(query)),
      query.limit ?? 10,
    );
  },

  getSettlements(
    query: { status: "pending" | "settled" | "all"; from?: Date; to?: Date },
    now: Date = new Date(),
  ): SettlementDto[] {
    if (query.status === "pending") {
      return buildSettlements(financeRepository.findPendingSettlements(now), now, "pending");
    }
    return buildSettlements(
      financeRepository.findSettlementsBetween(resolveRange(query)),
      now,
      query.status,
    );
  },
};
