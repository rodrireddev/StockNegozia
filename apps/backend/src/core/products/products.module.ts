import { Module } from "@nestjs/common";
import { CategoriesModule } from "../categories/categories.module";
import { PurchasesRepository } from "../purchases/purchases.repository";
import { StockMovementsModule } from "../stock-movements/stock-movements.module";
import { SuppliersModule } from "../suppliers/suppliers.module";
import { ProductsController } from "./products.controller";
import { ProductsRepository } from "./products.repository";
import { ProductsService } from "./products.service";

/**
 * `PurchasesRepository` se provee acá directamente (no se importa `PurchasesModule`) porque
 * `PurchasesModule` ya importa `ProductsModule` — importarlo de vuelta sería un ciclo. Como
 * `PurchasesRepository` es sin estado (solo envuelve `DRIZZLE_CLIENT`, global vía
 * `DatabaseModule`), registrarlo en dos módulos no duplica lógica ni datos, solo la instancia de
 * DI — ver `ProductsService.create()` §Stock inicial, que la usa para dejar la compra real que
 * explica el costo de un producto creado con stock inicial > 0.
 */
@Module({
  imports: [CategoriesModule, StockMovementsModule, SuppliersModule],
  controllers: [ProductsController],
  providers: [ProductsService, ProductsRepository, PurchasesRepository],
  exports: [ProductsService],
})
export class ProductsModule {}
