import type {
  FinancePaymentRow,
  FinancePurchaseRow,
  FinanceSaleLineRow,
} from "@stocknegozia/shared";
import { and, eq, gt, gte, isNotNull, lte, type SQL } from "drizzle-orm";
import { db } from "@/database/client";
import type { DrizzleExecutor } from "@/database/database.types";
import { products, purchases, saleItems, salePayments, sales } from "@/database/schema";

export interface FinanceRange {
  from: Date;
  to: Date;
}

/** Mismas consultas que `apps/backend/src/core/finance/finance.repository.ts`, sobre la base local.
 *  Sólo ventas `completed`. */
function paymentRows(
  conditions: (SQL | undefined)[],
  executor: DrizzleExecutor,
): FinancePaymentRow[] {
  return executor
    .select({
      paymentId: salePayments.id,
      saleId: sales.id,
      saleTotal: sales.total,
      method: salePayments.method,
      amount: salePayments.amount,
      surchargeAmount: salePayments.surchargeAmount,
      feeAmount: salePayments.feeAmount,
      cardBrand: salePayments.cardBrand,
      installments: salePayments.installments,
      settlementDate: salePayments.settlementDate,
      createdAt: sales.createdAt,
    })
    .from(sales)
    .leftJoin(salePayments, eq(salePayments.saleId, sales.id))
    .where(and(eq(sales.status, "completed"), ...conditions))
    .all();
}

export const financeRepository = {
  findSaleLines(range: FinanceRange, executor: DrizzleExecutor = db): FinanceSaleLineRow[] {
    return executor
      .select({
        saleId: saleItems.saleId,
        productId: saleItems.productId,
        productName: products.name,
        quantity: saleItems.quantity,
        revenue: saleItems.subtotal,
        unitCost: saleItems.unitCost,
        createdAt: sales.createdAt,
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .innerJoin(products, eq(saleItems.productId, products.id))
      .where(
        and(
          eq(sales.status, "completed"),
          gte(sales.createdAt, range.from),
          lte(sales.createdAt, range.to),
        ),
      )
      .all()
      .map(({ unitCost, ...row }) => ({
        ...row,
        cost: Math.round(unitCost * row.quantity * 100) / 100,
      }));
  },

  /** Pagos de las ventas del período (una fila `method: null` por venta sin pagos). */
  findPayments(range: FinanceRange, executor: DrizzleExecutor = db): FinancePaymentRow[] {
    return paymentRows(
      [gte(sales.createdAt, range.from), lte(sales.createdAt, range.to)],
      executor,
    );
  },

  /** Pagos con acreditación posterior a `now`, de cualquier fecha de venta. */
  findPendingSettlements(now: Date, executor: DrizzleExecutor = db): FinancePaymentRow[] {
    return paymentRows(
      [isNotNull(salePayments.settlementDate), gt(salePayments.settlementDate, now)],
      executor,
    );
  },

  /** Pagos que se acreditaron (o se acreditan) dentro del rango. */
  findSettlementsBetween(range: FinanceRange, executor: DrizzleExecutor = db) {
    return paymentRows(
      [
        isNotNull(salePayments.settlementDate),
        gte(salePayments.settlementDate, range.from),
        lte(salePayments.settlementDate, range.to),
      ],
      executor,
    );
  },

  findPurchases(range: FinanceRange, executor: DrizzleExecutor = db): FinancePurchaseRow[] {
    return executor
      .select({ total: purchases.total, createdAt: purchases.createdAt })
      .from(purchases)
      .where(and(gte(purchases.createdAt, range.from), lte(purchases.createdAt, range.to)))
      .all();
  },
};
