import { Inject, Injectable } from "@nestjs/common";
import type { PaymentMethod } from "@stocknegozia/api-contracts";
import { and, asc, desc, eq, gte, inArray, lte, type SQL } from "drizzle-orm";
import { DRIZZLE_CLIENT } from "../../database/database.constants";
import type { Database, DrizzleExecutor } from "../../database/database.types";
import { products, saleItems, salePayments, sales, stockMovements } from "../../database/schema";

export interface ProfitFilters {
  productId?: number;
  from?: Date;
  to?: Date;
}

@Injectable()
export class ProfitsRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  /**
   * Une `sale_items` con `sales` (para filtrar por fecha y descartar canceladas), `products`
   * (nombre) y el `stock_movement` tipo `SALE` que la venta generó (para el dispositivo/vendedor
   * que la hizo — mismo dato que ya muestra "Movimientos", ver
   * `StockMovementsRepository.findMany`). Nunca lee `products.purchasePrice`/`salePrice`
   * actuales: ambos precios ya vienen congelados en `sale_items` (`unitPrice`/`unitCost`).
   */
  findMany(filters: ProfitFilters, executor: DrizzleExecutor = this.db) {
    // Una venta cancelada devolvió su stock y no representa una ganancia real — mismo criterio que
    // `sales.total` en recibos, que tampoco cuenta canceladas.
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
        deviceName: stockMovements.deviceName,
        deviceType: stockMovements.deviceType,
        createdAt: sales.createdAt,
      })
      .from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .innerJoin(products, eq(saleItems.productId, products.id))
      .leftJoin(
        stockMovements,
        and(
          eq(stockMovements.saleId, saleItems.saleId),
          eq(stockMovements.productId, saleItems.productId),
          eq(stockMovements.type, "SALE"),
        ),
      )
      .where(and(...conditions))
      .orderBy(desc(sales.createdAt), desc(saleItems.id))
      .all();
  }

  /** Medios de pago (sin repetir) de cada venta, para anotar las líneas del historial. */
  findPaymentMethodsBySaleIds(saleIds: number[], executor: DrizzleExecutor = this.db) {
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
  }
}
