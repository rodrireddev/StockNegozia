import { Inject, Injectable } from "@nestjs/common";
import type {
  FinancePaymentRow,
  FinancePurchaseRow,
  FinanceSaleLineRow,
} from "@stocknegozia/shared";
import { and, eq, gt, gte, isNotNull, lte, sql, type SQL } from "drizzle-orm";
import { DRIZZLE_CLIENT } from "../../database/database.constants";
import type { Database, DrizzleExecutor } from "../../database/database.types";
import {
  customerPayments,
  customers,
  products,
  purchases,
  saleItems,
  salePayments,
  sales,
} from "../../database/schema";
import { customerBalanceSql } from "../customers/customers.repository";

export interface FinanceRange {
  from: Date;
  to: Date;
}

/** Consultas planas para las agregaciones de `@stocknegozia/shared` (`buildFinanceSummary`). Sólo
 *  ventas `completed`: una venta cancelada devolvió el stock y no es ni ingreso ni cobro. */
@Injectable()
export class FinanceRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  findSaleLines(range: FinanceRange, executor: DrizzleExecutor = this.db): FinanceSaleLineRow[] {
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
  }

  private paymentRows(conditions: (SQL | undefined)[], executor: DrizzleExecutor) {
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

  /** Pagos de las ventas del período (una fila `method: null` por venta sin pagos). */
  findPayments(range: FinanceRange, executor: DrizzleExecutor = this.db): FinancePaymentRow[] {
    return this.paymentRows(
      [gte(sales.createdAt, range.from), lte(sales.createdAt, range.to)],
      executor,
    );
  }

  /** Pagos con acreditación posterior a `now`, de cualquier fecha de venta. */
  findPendingSettlements(now: Date, executor: DrizzleExecutor = this.db): FinancePaymentRow[] {
    return this.paymentRows(
      [isNotNull(salePayments.settlementDate), gt(salePayments.settlementDate, now)],
      executor,
    );
  }

  /** Pagos que se acreditaron (o se acreditan) dentro del rango. */
  findSettlementsBetween(range: FinanceRange, executor: DrizzleExecutor = this.db) {
    return this.paymentRows(
      [
        isNotNull(salePayments.settlementDate),
        gte(salePayments.settlementDate, range.from),
        lte(salePayments.settlementDate, range.to),
      ],
      executor,
    );
  }

  /** Pagos de cuenta corriente recibidos en el período. */
  findCustomerPayments(range: FinanceRange, executor: DrizzleExecutor = this.db) {
    return executor
      .select({ amount: customerPayments.amount })
      .from(customerPayments)
      .where(
        and(gte(customerPayments.createdAt, range.from), lte(customerPayments.createdAt, range.to)),
      )
      .all();
  }

  /** Total adeudado hoy: suma de saldos positivos (un saldo a favor no descuenta deuda de otro). */
  findOutstandingReceivables(executor: DrizzleExecutor = this.db): number {
    const balance = customerBalanceSql(customers.id);
    const row = executor
      .select({
        total:
          sql<number>`coalesce(sum(case when ${balance} > 0 then ${balance} else 0 end), 0)`.mapWith(
            Number,
          ),
      })
      .from(customers)
      .get();
    return row?.total ?? 0;
  }

  findPurchases(range: FinanceRange, executor: DrizzleExecutor = this.db): FinancePurchaseRow[] {
    return executor
      .select({ total: purchases.total, createdAt: purchases.createdAt })
      .from(purchases)
      .where(and(gte(purchases.createdAt, range.from), lte(purchases.createdAt, range.to)))
      .all();
  }
}
