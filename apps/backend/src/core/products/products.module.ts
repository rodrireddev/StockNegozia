import { Module } from "@nestjs/common";
import { CategoriesModule } from "../categories/categories.module";
import { StockMovementsModule } from "../stock-movements/stock-movements.module";
import { ProductsController } from "./products.controller";
import { ProductsRepository } from "./products.repository";
import { ProductsService } from "./products.service";

@Module({
  imports: [CategoriesModule, StockMovementsModule],
  controllers: [ProductsController],
  providers: [ProductsService, ProductsRepository],
  exports: [ProductsService],
})
export class ProductsModule {}
