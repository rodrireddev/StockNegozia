import { createHashRouter } from "react-router-dom";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { InventoryCategoriesPage } from "@/features/inventory/pages/InventoryCategoriesPage";
import { InventoryMovementsPage } from "@/features/inventory/pages/InventoryMovementsPage";
import { InventoryStockPage } from "@/features/inventory/pages/InventoryStockPage";
import { ProductFormPage } from "@/features/products/pages/ProductFormPage";
import { ProductsPage } from "@/features/products/pages/ProductsPage";
import { NewPurchasePage } from "@/features/purchases/pages/NewPurchasePage";
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
      { path: "purchases/suppliers", element: <SuppliersPage /> },
      { path: "inventory", element: <InventoryStockPage /> },
      { path: "inventory/categories", element: <InventoryCategoriesPage /> },
      { path: "inventory/movements", element: <InventoryMovementsPage /> },
    ],
  },
]);
