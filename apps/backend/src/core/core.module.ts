import { Module } from "@nestjs/common";
import { CashAdjustmentsModule } from "./cash-adjustments/cash-adjustments.module";
import { CustomersModule } from "./customers/customers.module";
import { FinanceModule } from "./finance/finance.module";
import { InventoryModule } from "./inventory/inventory.module";
import { PermissionsModule } from "./permissions/permissions.module";
import { ProductsModule } from "./products/products.module";
import { ProfitsModule } from "./profits/profits.module";
import { PurchasesModule } from "./purchases/purchases.module";
import { SalesModule } from "./sales/sales.module";
import { SettingsModule } from "./settings/settings.module";
import { StockMovementsModule } from "./stock-movements/stock-movements.module";
import { SuppliersModule } from "./suppliers/suppliers.module";
import { UsersModule } from "./users/users.module";

/**
 * Agrega los módulos de dominio de StockNegozia. Ver core/README.md — `inventory/`, `customers/`,
 * `users/` y `permissions/` siguen siendo placeholders estructurales sin lógica de negocio.
 * `StockMovementsModule` (ver docs/inventory/STOCK_MOVEMENTS.md), `SuppliersModule`,
 * `PurchasesModule` (ver docs/inventory/PURCHASES.md), `ProfitsModule` y `CashAdjustmentsModule`
 * son reales.
 */
@Module({
  imports: [
    ProductsModule,
    InventoryModule,
    SalesModule,
    CashAdjustmentsModule,
    ProfitsModule,
    FinanceModule,
    SettingsModule,
    StockMovementsModule,
    SuppliersModule,
    PurchasesModule,
    CustomersModule,
    UsersModule,
    PermissionsModule,
  ],
})
export class CoreModule {}
