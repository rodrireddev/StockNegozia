import { Module } from "@nestjs/common";
import { CustomersModule } from "./customers/customers.module";
import { InventoryModule } from "./inventory/inventory.module";
import { PermissionsModule } from "./permissions/permissions.module";
import { ProductsModule } from "./products/products.module";
import { PurchasesModule } from "./purchases/purchases.module";
import { SalesModule } from "./sales/sales.module";
import { StockMovementsModule } from "./stock-movements/stock-movements.module";
import { SuppliersModule } from "./suppliers/suppliers.module";
import { UsersModule } from "./users/users.module";

/**
 * Agrega los módulos de dominio de StockNegozia. Ver core/README.md — `inventory/`, `customers/`,
 * `users/` y `permissions/` siguen siendo placeholders estructurales sin lógica de negocio.
 * `StockMovementsModule` (ver docs/inventory/STOCK_MOVEMENTS.md), `SuppliersModule` y
 * `PurchasesModule` (ver docs/inventory/PURCHASES.md) son reales.
 */
@Module({
  imports: [
    ProductsModule,
    InventoryModule,
    SalesModule,
    StockMovementsModule,
    SuppliersModule,
    PurchasesModule,
    CustomersModule,
    UsersModule,
    PermissionsModule,
  ],
})
export class CoreModule {}
