import type { StockMovementDirection, StockMovementType } from "@stocknegozia/api-contracts";
import { and, desc, eq, gte, lte, type SQL } from "drizzle-orm";
import { db } from "@/database/client";
import type { DrizzleExecutor } from "@/database/database.types";
import { purchaseItems, saleItems, stockMovements } from "@/database/schema";

export interface NewStockMovementRecord {
  productId: number;
  type: StockMovementType;
  direction: StockMovementDirection;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  saleId?: number;
  purchaseId?: number;
  reason?: string;
}

export interface StockMovementFilters {
  productId?: number;
  type?: StockMovementType;
  direction?: StockMovementDirection;
  from?: Date;
  to?: Date;
}

export const stockMovementsRepository = {
  insert(data: NewStockMovementRecord, executor: DrizzleExecutor = db) {
    return executor
      .insert(stockMovements)
      .values({ ...data, createdAt: new Date() })
      .returning()
      .get();
  },

  /** Mismo join que `apps/backend/src/core/stock-movements/stock-movements.repository.ts` para
   *  resolver el precio histórico de la operación (`unitValue`) — nunca el precio ACTUAL del
   *  producto: `sale_items`/`purchase_items` son inmutables una vez creados. */
  findMany(filters: StockMovementFilters, executor: DrizzleExecutor = db) {
    const conditions: (SQL | undefined)[] = [];

    if (filters.productId !== undefined)
      conditions.push(eq(stockMovements.productId, filters.productId));
    if (filters.type) conditions.push(eq(stockMovements.type, filters.type));
    if (filters.direction) conditions.push(eq(stockMovements.direction, filters.direction));
    if (filters.from) conditions.push(gte(stockMovements.createdAt, filters.from));
    if (filters.to) conditions.push(lte(stockMovements.createdAt, filters.to));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return (
      executor
        .select({
          id: stockMovements.id,
          productId: stockMovements.productId,
          type: stockMovements.type,
          direction: stockMovements.direction,
          quantity: stockMovements.quantity,
          stockBefore: stockMovements.stockBefore,
          stockAfter: stockMovements.stockAfter,
          saleId: stockMovements.saleId,
          purchaseId: stockMovements.purchaseId,
          reason: stockMovements.reason,
          createdAt: stockMovements.createdAt,
          saleUnitPrice: saleItems.unitPrice,
          purchaseUnitCost: purchaseItems.unitCost,
        })
        .from(stockMovements)
        .leftJoin(
          saleItems,
          and(
            eq(stockMovements.saleId, saleItems.saleId),
            eq(stockMovements.productId, saleItems.productId),
          ),
        )
        .leftJoin(
          purchaseItems,
          and(
            eq(stockMovements.purchaseId, purchaseItems.purchaseId),
            eq(stockMovements.productId, purchaseItems.productId),
          ),
        )
        .where(whereClause)
        // `id` como desempate: dos movimientos de una misma venta multi-item pueden compartir el
        // mismo `createdAt` (resolución de milisegundo).
        .orderBy(desc(stockMovements.createdAt), desc(stockMovements.id))
        .all()
    );
  },
};
