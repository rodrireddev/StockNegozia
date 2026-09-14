import { Module } from "@nestjs/common";
import { ProductsModule } from "../products/products.module";
import { SalesController } from "./sales.controller";
import { SalesRepository } from "./sales.repository";
import { SalesService } from "./sales.service";

@Module({
  imports: [ProductsModule],
  controllers: [SalesController],
  providers: [SalesService, SalesRepository],
})
export class SalesModule {}
