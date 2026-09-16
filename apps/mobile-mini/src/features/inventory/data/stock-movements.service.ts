import type { StockMovementDto } from "@stocknegozia/api-contracts";
import { BadRequestError } from "@/database/errors";
import type { DrizzleExecutor } from "@/database/database.types";
import {
  stockMovementsRepository,
  type NewStockMovementRecord,
  type StockMovementFilters,
} from "./stock-movements.repository";

type StockMovementRow = ReturnType<typeof stockMovementsRepository.findMany>[number];
type InsertedStockMovementRow = ReturnType<typeof stockMovementsRepository.insert>;

/**
 * Sin `deviceId`/`deviceName`/`deviceType`/`requestId`: mobile-mini no tiene contexto HTTP ni
 * dispositivos múltiples que trazar — siempre `null`, mismo shape de `StockMovementDto` que el
 * resto del monorepo (así el historial reutiliza `movement-labels.ts` de `@stocknegozia/shared`
 * sin cambios: `describeMovementActor` ya devuelve `null` cuando `deviceName` es `null`).
 */
function toDto(row: StockMovementRow | InsertedStockMovementRow): StockMovementDto {
  return {
    id: row.id,
    productId: row.productId,
    type: row.type,
    direction: row.direction,
    quantity: row.quantity,
    stockBefore: row.stockBefore,
    stockAfter: row.stockAfter,
    saleId: row.saleId,
    purchaseId: row.purchaseId,
    requestId: null,
    reason: row.reason,
    deviceId: null,
    deviceName: null,
    deviceType: null,
    createdAt: row.createdAt.toISOString(),
    unitValue: "saleUnitPrice" in row ? (row.saleUnitPrice ?? row.purchaseUnitCost ?? null) : null,
  };
}

export type RecordStockMovementInput = NewStockMovementRecord;

/** Responsabilidad exclusiva: registrar y consultar. NUNCA modifica `products.stock` — eso sigue
 *  siendo responsabilidad exclusiva de `productsService.adjustStock`, que es quien llama a
 *  `record()` después de aplicar el cambio (mismo diseño que el backend). */
export const stockMovementsService = {
  record(input: RecordStockMovementInput, executor?: DrizzleExecutor): StockMovementDto {
    if (input.quantity <= 0) {
      throw new BadRequestError("La cantidad de un movimiento de stock debe ser positiva");
    }
    const row = stockMovementsRepository.insert(input, executor);
    return toDto(row);
  },

  findMany(filters: StockMovementFilters = {}): StockMovementDto[] {
    return stockMovementsRepository.findMany(filters).map(toDto);
  },

  findByProduct(productId: number, filters: Omit<StockMovementFilters, "productId"> = {}): StockMovementDto[] {
    return stockMovementsService.findMany({ ...filters, productId });
  },
};
