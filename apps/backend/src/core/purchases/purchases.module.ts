import { Module } from "@nestjs/common";
import { ProductsModule } from "../products/products.module";
import { SuppliersModule } from "../suppliers/suppliers.module";
import { PurchasesController } from "./purchases.controller";
import { PurchasesRepository } from "./purchases.repository";
import { PurchasesService } from "./purchases.service";

/**
 * Compras — ver docs/inventory/PURCHASES.md. Importa `ProductsModule` (para
 * `ProductsService.adjustStock()`, único punto de mutación de `products.stock`) y
 * `SuppliersModule` (para validar el proveedor asociado a la compra), mismo patrón que
 * `SalesModule`.
 */
@Module({
  imports: [ProductsModule, SuppliersModule],
  controllers: [PurchasesController],
  providers: [PurchasesService, PurchasesRepository],
})
export class PurchasesModule {}
