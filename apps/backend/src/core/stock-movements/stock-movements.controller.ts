import { Controller, Get, Inject, Param, ParseIntPipe, Query } from "@nestjs/common";
import type { StockMovementDto } from "@stocknegozia/api-contracts";
import { stockMovementQuerySchema, type StockMovementQueryInput } from "@stocknegozia/validation";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { StockMovementsService } from "./stock-movements.service";

/**
 * Sin prefijo de clase — expone dos formas de consultar el mismo historial (global filtrable, y
 * anidado bajo un producto) sin tocar `ProductsController` (ver docs/inventory/STOCK_MOVEMENTS.md
 * §API). Solo lectura: no hay ningún endpoint que modifique stock ni movimientos acá.
 */
@Controller()
export class StockMovementsController {
  // @Inject explícito: la inyección automática por tipo de NestJS depende de metadata que `tsc`
  // emite pero esbuild (usado por Vitest) no — ver el mismo comentario en GlobalExceptionFilter.
  constructor(
    @Inject(StockMovementsService) private readonly stockMovementsService: StockMovementsService,
  ) {}

  @Get("stock-movements")
  findMany(
    @Query(new ZodValidationPipe(stockMovementQuerySchema)) query: StockMovementQueryInput,
  ): StockMovementDto[] {
    return this.stockMovementsService.findMany(query);
  }

  @Get("products/:productId/stock-movements")
  findByProduct(
    @Param("productId", ParseIntPipe) productId: number,
    @Query(new ZodValidationPipe(stockMovementQuerySchema)) query: StockMovementQueryInput,
  ): StockMovementDto[] {
    return this.stockMovementsService.findByProduct(productId, {
      type: query.type,
      direction: query.direction,
      from: query.from,
      to: query.to,
    });
  }
}
