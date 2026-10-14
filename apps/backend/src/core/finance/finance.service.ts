import { Inject, Injectable } from "@nestjs/common";
import type { FinanceSummaryDto, SettlementDto, TopProductDto } from "@stocknegozia/api-contracts";
import {
  buildFinanceSummary,
  buildSettlements,
  buildTopProducts,
  resolveFinancePeriod,
} from "@stocknegozia/shared";
import { CashAdjustmentsService } from "../cash-adjustments/cash-adjustments.service";
import { FinanceRepository, type FinanceRange } from "./finance.repository";

/** Sin rango explícito: el día de hoy. Con sólo uno de los extremos se completa el otro. */
function resolveRange(range: { from?: Date; to?: Date }): FinanceRange {
  const today = resolveFinancePeriod("today");
  return { from: range.from ?? today.from, to: range.to ?? today.to };
}

/**
 * Finanzas — ventas, compras, caja y cobros como miradas separadas (ver `FinanceSummaryDto`). Sólo
 * lectura; las agregaciones son las mismas funciones puras que usa Mobile Mini.
 */
@Injectable()
export class FinanceService {
  constructor(
    @Inject(FinanceRepository) private readonly repository: FinanceRepository,
    @Inject(CashAdjustmentsService) private readonly cashAdjustmentsService: CashAdjustmentsService,
  ) {}

  getSummary(query: { from?: Date; to?: Date }, now: Date = new Date()): FinanceSummaryDto {
    const range = resolveRange(query);
    return buildFinanceSummary({
      ...range,
      now,
      saleLines: this.repository.findSaleLines(range),
      payments: this.repository.findPayments(range),
      purchases: this.repository.findPurchases(range),
      cashAdjustments: this.cashAdjustmentsService
        .findMany(range)
        .map((row) => ({ ...row, createdAt: new Date(row.createdAt) })),
      pendingPayments: this.repository.findPendingSettlements(now),
    });
  }

  getTopProducts(query: { from?: Date; to?: Date; limit: number }): TopProductDto[] {
    return buildTopProducts(this.repository.findSaleLines(resolveRange(query)), query.limit);
  }

  /**
   * - `pending`: todo lo que falta acreditar a hoy (sin importar el rango).
   * - `settled`: lo acreditado dentro del rango.
   * - `all`: lo que se acredita dentro del rango, acreditado o no.
   */
  getSettlements(
    query: { status: "pending" | "settled" | "all"; from?: Date; to?: Date },
    now: Date = new Date(),
  ): SettlementDto[] {
    if (query.status === "pending") {
      return buildSettlements(this.repository.findPendingSettlements(now), now, "pending");
    }
    const range = resolveRange(query);
    return buildSettlements(this.repository.findSettlementsBetween(range), now, query.status);
  }
}
