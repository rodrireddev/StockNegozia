import { Module } from "@nestjs/common";
import { StockMovementsController } from "./stock-movements.controller";
import { StockMovementsRepository } from "./stock-movements.repository";
import { StockMovementsService } from "./stock-movements.service";

/**
 * Historial de movimientos de stock — ver docs/inventory/STOCK_MOVEMENTS.md. Importado por
 * `ProductsModule` (no al revés) para que `ProductsService.adjustStock()` pueda registrar cada
 * movimiento que produce — sigue siendo el único punto de mutación de `products.stock`.
 */
@Module({
  controllers: [StockMovementsController],
  providers: [StockMovementsRepository, StockMovementsService],
  exports: [StockMovementsService],
})
export class StockMovementsModule {}
