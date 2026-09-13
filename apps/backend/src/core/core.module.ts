import { Module } from "@nestjs/common";
import { CustomersModule } from "./customers/customers.module";
import { InventoryModule } from "./inventory/inventory.module";
import { PermissionsModule } from "./permissions/permissions.module";
import { ProductsModule } from "./products/products.module";
import { PurchasesModule } from "./purchases/purchases.module";
import { SalesModule } from "./sales/sales.module";
import { UsersModule } from "./users/users.module";

/**
 * Agrega los módulos de dominio de StockNegozia. Ver core/README.md — en esta etapa
 * son placeholders estructurales sin lógica de negocio.
 */
@Module({
  imports: [
    ProductsModule,
    InventoryModule,
    SalesModule,
    PurchasesModule,
    CustomersModule,
    UsersModule,
    PermissionsModule,
  ],
})
export class CoreModule {}
