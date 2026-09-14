import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import type { StockMovementDto } from "@stocknegozia/api-contracts";
import { AppLogger } from "../../common/logger/app-logger.service";
import { RequestContext } from "../../common/logger/request-context";
import type { DrizzleExecutor } from "../../database/database.types";
import { StockMovementsRepository, type NewStockMovementRecord, type StockMovementFilters } from "./stock-movements.repository";

type StockMovementRow = ReturnType<StockMovementsRepository["findMany"]>[number];
type InsertedStockMovementRow = ReturnType<StockMovementsRepository["insert"]>;

/**
 * `record()` inserta y devuelve la fila recién creada sin volver a consultarla con el join a
 * `sale_items`/`purchase_items` (sería una query extra que nada usa hoy — `ProductsService.
 * adjustStock()` descarta el valor devuelto). Por eso esa fila no trae `saleUnitPrice`/
 * `purchaseUnitCost` y acá se resuelve como `null`. El precio histórico real siempre está
 * disponible a través de `findMany()`/`findByProduct()` — el camino que efectivamente usa la UI de
 * Movimientos — nunca a través de esta rama.
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
    requestId: row.requestId,
    reason: row.reason,
    createdAt: row.createdAt.toISOString(),
    // Uno de los dos siempre es null (un movimiento nunca tiene sale_id y purchase_id a la vez —
    // ver stock-movements.ts) y ambos son null para ADJUSTMENT. Nunca se sustituye por el precio
    // actual del producto.
    unitValue: "saleUnitPrice" in row ? (row.saleUnitPrice ?? row.purchaseUnitCost ?? null) : null,
  };
}

export type RecordStockMovementInput = Omit<NewStockMovementRecord, "requestId">;

/**
 * Historial de movimientos de stock — ver docs/inventory/STOCK_MOVEMENTS.md. Responsabilidad
 * exclusiva: registrar y consultar. NUNCA modifica `products.stock` — eso sigue siendo
 * responsabilidad exclusiva de `ProductsService.adjustStock()`, que es quien llama a `record()`
 * después de aplicar el cambio.
 */
@Injectable()
export class StockMovementsService {
  // @Inject explícito: la inyección automática por tipo de NestJS depende de metadata que `tsc`
  // emite pero esbuild (usado por Vitest) no — ver el mismo comentario en GlobalExceptionFilter.
  constructor(
    @Inject(StockMovementsRepository) private readonly repository: StockMovementsRepository,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Registra un movimiento ya ocurrido. `requestId` se toma siempre del contexto ambiente
   * (`RequestContext.getRequestId()`) — nunca se genera acá ni se recibe como parámetro (ver
   * docs/inventory/STOCK_MOVEMENTS.md §requestId); es `undefined`/`null` fuera de un request HTTP,
   * y eso es un caso válido, no un error.
   *
   * `executor` permite participar en la transacción SQLite en curso del llamador (mismo patrón
   * `DrizzleExecutor` que ya usan `ProductsRepository`/`SalesRepository`) — así el movimiento se
   * crea atómicamente junto con el cambio de stock que lo originó.
   */
  record(input: RecordStockMovementInput, executor?: DrizzleExecutor): StockMovementDto {
    if (input.quantity <= 0) {
      throw new BadRequestException("La cantidad de un movimiento de stock debe ser positiva");
    }

    const row = this.repository.insert(
      { ...input, requestId: RequestContext.getRequestId() },
      executor,
    );

    this.logger.debug({
      context: "StockMovementsService",
      operation: "record",
      event: "stock.movement.created",
      message: "Stock movement recorded",
      metadata: {
        movementId: row.id,
        productId: input.productId,
        type: input.type,
        direction: input.direction,
        quantity: input.quantity,
        stockBefore: input.stockBefore,
        stockAfter: input.stockAfter,
        saleId: input.saleId,
        purchaseId: input.purchaseId,
        reason: input.reason,
      },
    });

    return toDto(row);
  }

  findMany(filters: StockMovementFilters = {}): StockMovementDto[] {
    return this.repository.findMany(filters).map(toDto);
  }

  findByProduct(productId: number, filters: Omit<StockMovementFilters, "productId"> = {}): StockMovementDto[] {
    return this.findMany({ ...filters, productId });
  }
}
