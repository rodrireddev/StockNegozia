import type { PaymentMethod } from "@stocknegozia/api-contracts";
import { and, asc, desc, eq, gte, inArray, lte, type SQL } from "drizzle-orm";
import { db } from "@/database/client";
import type { DrizzleExecutor } from "@/database/database.types";
import { products, saleItems, salePayments, sales } from "@/database/schema";

export interface ProfitFilters {
  productId?: number;
  from?: Date;
  to?: Date;
}

export const profitsRepository = {
  /**
   * Une `sale_items` con `sales` (para filtrar por fecha y descartar canceladas) y `products`
   * (para el nombre) — nunca lee `products.purchasePrice`/`salePrice` actuales, ambos precios ya
   * vienen congelados en `sale_items` (`unitPrice`/`unitCost`).
   */
  findMany(filters: ProfitFilters, executor: DrizzleExecutor = db) {
    // Una venta cancelada devolvió su stock y no representa una ganancia real — mismo criterio que
    // el total de `sales.total` en recibos, que tampoco cuenta canceladas.
    const conditions: (SQL | undefined)[] = [eq(sales.status, "completed")];

    if (filters.productId !== undefined)
      conditions.push(eq(saleItems.productId, filters.productId));
    if (filters.from) conditions.push(gte(sales.createdAt, filters.from));
    if (filters.to) conditions.push(lte(sales.createdAt, filters.to));

    return executor
      .select({
        id: saleItems.id,
        saleId: saleItems.saleId,
        productId: saleItems.productId,
        productName: products.name,
        quantity: saleItems.quantity,
        unitPrice: saleItems.unitPrice,
        unitCost: saleItems.unitCost,
        subtotal: saleItems.subtotal,
        createdAt: sales.createdAt,
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .innerJoin(products, eq(saleItems.productId, products.id))
      .where(and(...conditions))
      .orderBy(desc(sales.createdAt), desc(saleItems.id))
      .all();
  },

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
};
