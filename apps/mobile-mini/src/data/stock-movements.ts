import type { StockMovementDto } from "@stocknegozia/api-contracts";
import { stockMovementsService } from "@/features/inventory/data/stock-movements.service";

export interface StockMovementQuery {
  productId?: number;
  type?: string;
  direction?: string;
}

/** Mismos filtros que el cliente completo (`productId`/`type`/`direction`, sin rango de fechas —
 *  ver `apps/mobile/src/api/endpoints/stock-movements.ts`). */
export async function fetchStockMovements(query: StockMovementQuery = {}): Promise<StockMovementDto[]> {
  return stockMovementsService.findMany({
    productId: query.productId,
    type: query.type as StockMovementDto["type"] | undefined,
    direction: query.direction as StockMovementDto["direction"] | undefined,
  });
}
