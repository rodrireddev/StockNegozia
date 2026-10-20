import { Inject, Injectable } from "@nestjs/common";
import type {
  DeviceType,
  StockMovementDirection,
  StockMovementType,
} from "@stocknegozia/api-contracts";
import { and, desc, eq, gte, lte, type SQL } from "drizzle-orm";
import { DRIZZLE_CLIENT } from "../../database/database.constants";
import type { Database, DrizzleExecutor } from "../../database/database.types";
import { purchaseItems, saleItems, stockMovements } from "../../database/schema";

export interface NewStockMovementRecord {
  productId: number;
  type: StockMovementType;
  direction: StockMovementDirection;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  saleId?: number;
  purchaseId?: number;
  requestId?: string;
  reason?: string;
  deviceId?: string;
  deviceName?: string;
  deviceType?: DeviceType;
}

export interface StockMovementFilters {
  productId?: number;
  type?: StockMovementType;
  direction?: StockMovementDirection;
  from?: Date;
  to?: Date;
}

@Injectable()
export class StockMovementsRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  insert(data: NewStockMovementRecord, executor: DrizzleExecutor = this.db) {
    return executor
      .insert(stockMovements)
      .values({ ...data, createdAt: new Date() })
      .returning()
      .get();
  }

  findMany(filters: StockMovementFilters, executor: DrizzleExecutor = this.db) {
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
          requestId: stockMovements.requestId,
          reason: stockMovements.reason,
          deviceId: stockMovements.deviceId,
          deviceName: stockMovements.deviceName,
          deviceType: stockMovements.deviceType,
          createdAt: stockMovements.createdAt,
          // Precio histórico de la operación — nunca el precio ACTUAL del producto (ver
          // docs/inventory/STOCK_MOVEMENTS.md §Precio histórico). `sale_items`/`purchase_items` son
          // inmutables una vez creados, así que este valor no cambia si después se edita
          // `products.salePrice`/`purchasePrice`. `(saleId, productId)` y `(purchaseId, productId)`
          // son únicos por construcción (Sales normaliza duplicados antes de insertar, Purchases los
          // rechaza), así que cada join matchea a lo sumo una fila.
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
        // mismo `createdAt` (resolución de milisegundo) — el id autoincremental sí preserva el
        // orden de inserción de forma determinística.
        .orderBy(desc(stockMovements.createdAt), desc(stockMovements.id))
        .all()
    );
  }
}
