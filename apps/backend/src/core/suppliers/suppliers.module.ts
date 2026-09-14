import { Module } from "@nestjs/common";
import { SuppliersController } from "./suppliers.controller";
import { SuppliersRepository } from "./suppliers.repository";
import { SuppliersService } from "./suppliers.service";

/**
 * Estructura mínima de proveedores — ver docs/inventory/PURCHASES.md. Exporta `SuppliersService`
 * para que `PurchasesModule` pueda validar la existencia del proveedor al crear una compra.
 */
@Module({
  controllers: [SuppliersController],
  providers: [SuppliersService, SuppliersRepository],
  exports: [SuppliersService],
})
export class SuppliersModule {}
