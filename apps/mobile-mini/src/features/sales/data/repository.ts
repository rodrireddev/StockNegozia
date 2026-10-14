import type { CardBrand, PaymentMethod } from "@stocknegozia/api-contracts";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/database/client";
import type { DrizzleExecutor } from "@/database/database.types";
import { saleItems, salePayments, sales } from "@/database/schema";

export interface NewSaleRecord {
  status: "completed";
  total: number;
  createdAt: Date;
}

export interface NewSaleItemRecord {
  saleId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  subtotal: number;
}

export interface NewSalePaymentRecord {
  saleId: number;
  method: PaymentMethod;
  amount: number;
  installments: number | null;
  cardBrand: CardBrand | null;
  reference: string | null;
  amountReceived: number | null;
  change: number | null;
  surchargePercent: number;
  surchargeAmount: number;
  feePercent: number;
  feeAmount: number;
  settlementDate: Date | null;
}

export const salesRepository = {
  insertSale(data: NewSaleRecord, executor: DrizzleExecutor = db) {
    return executor.insert(sales).values(data).returning({ id: sales.id }).get();
  },

  insertSaleItems(items: NewSaleItemRecord[], executor: DrizzleExecutor = db) {
    if (items.length === 0) return;
    executor.insert(saleItems).values(items).run();
  },

  insertSalePayments(payments: NewSalePaymentRecord[], executor: DrizzleExecutor = db) {
    if (payments.length === 0) return;
    executor.insert(salePayments).values(payments).run();
  },

  findPaymentsBySaleId(saleId: number, executor: DrizzleExecutor = db) {
    return executor
      .select()
      .from(salePayments)
      .where(eq(salePayments.saleId, saleId))
      .orderBy(asc(salePayments.id))
      .all();
  },

  /** Medios de pago (sin repetir, en orden de carga) de varias ventas a la vez. */
  findPaymentMethodsBySaleIds(saleIds: number[], executor: DrizzleExecutor = db) {
    const result = new Map<number, PaymentMethod[]>();
    if (saleIds.length === 0) return result;
    const rows = executor
      .select({ saleId: salePayments.saleId, method: salePayments.method })
      .from(salePayments)
      .where(inArray(salePayments.saleId, saleIds))
      .orderBy(asc(salePayments.id))
      .all();
    for (const row of rows) {
      const methods = result.get(row.saleId) ?? [];
      if (!methods.includes(row.method)) methods.push(row.method);
      result.set(row.saleId, methods);
    }
    return result;
  },

  findById(id: number, executor: DrizzleExecutor = db) {
    return executor.select().from(sales).where(eq(sales.id, id)).get();
  },

  findMany(executor: DrizzleExecutor = db) {
    return executor.select().from(sales).orderBy(desc(sales.createdAt)).all();
  },

  findItemsBySaleId(saleId: number, executor: DrizzleExecutor = db) {
    return executor.select().from(saleItems).where(eq(saleItems.saleId, saleId)).all();
  },

  markCancelled(id: number, cancelledAt: Date, executor: DrizzleExecutor = db) {
    executor.update(sales).set({ status: "cancelled", cancelledAt }).where(eq(sales.id, id)).run();
  },
};
