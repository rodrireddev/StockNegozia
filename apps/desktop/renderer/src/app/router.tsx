import { createHashRouter } from "react-router-dom";
import { SettingsPage } from "@/features/backup/pages/SettingsPage";
import { BenefitsPage } from "@/features/benefits/pages/BenefitsPage";
import { CashAdjustmentsPage } from "@/features/cash-adjustments/pages/CashAdjustmentsPage";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { DevicesPage } from "@/features/devices/pages/DevicesPage";
import { FinanceCashPage } from "@/features/finance/pages/FinanceCashPage";
import { FinanceCollectionsPage } from "@/features/finance/pages/FinanceCollectionsPage";
import { FinanceOverviewPage } from "@/features/finance/pages/FinanceOverviewPage";
import { FinancePurchasesPage } from "@/features/finance/pages/FinancePurchasesPage";
import { FinanceSalesPage } from "@/features/finance/pages/FinanceSalesPage";
import { InventoryCategoriesPage } from "@/features/inventory/pages/InventoryCategoriesPage";
import { InventoryMovementsPage } from "@/features/inventory/pages/InventoryMovementsPage";
import { InventoryStockPage } from "@/features/inventory/pages/InventoryStockPage";
import { ProductFormPage } from "@/features/products/pages/ProductFormPage";
import { ProductsPage } from "@/features/products/pages/ProductsPage";
import { NewPurchasePage } from "@/features/purchases/pages/NewPurchasePage";
import { CustomersPage } from "@/features/customers/pages/CustomersPage";
import { SalesPage } from "@/features/sales/pages/SalesPage";
import { SuppliersPage } from "@/features/suppliers/pages/SuppliersPage";
import { MainLayout } from "@/layouts/MainLayout";

export const router = createHashRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "products", element: <ProductsPage /> },
      { path: "products/new", element: <ProductFormPage /> },
      { path: "products/:id/edit", element: <ProductFormPage /> },
      { path: "sales", element: <SalesPage /> },
      { path: "purchases", element: <NewPurchasePage /> },
      { path: "inventory", element: <InventoryStockPage /> },
      { path: "inventory/categories", element: <InventoryCategoriesPage /> },
      { path: "inventory/movements", element: <InventoryMovementsPage /> },
      { path: "profits", element: <FinanceOverviewPage /> },
      { path: "profits/sales", element: <FinanceSalesPage /> },
      { path: "profits/purchases", element: <FinancePurchasesPage /> },
      { path: "profits/cash", element: <FinanceCashPage /> },
      { path: "profits/collections", element: <FinanceCollectionsPage /> },
      { path: "cash-adjustments", element: <CashAdjustmentsPage /> },
      { path: "customers", element: <CustomersPage /> },
      { path: "suppliers", element: <SuppliersPage /> },
      { path: "devices", element: <DevicesPage /> },
      { path: "benefits", element: <BenefitsPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);
