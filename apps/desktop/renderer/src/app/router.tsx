import { createHashRouter } from "react-router-dom";
import { CustomersPage } from "@/features/customers/pages/CustomersPage";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { InventoryPage } from "@/features/inventory/pages/InventoryPage";
import { ProductFormPage } from "@/features/products/pages/ProductFormPage";
import { ProductsPage } from "@/features/products/pages/ProductsPage";
import { PurchasesPage } from "@/features/purchases/pages/PurchasesPage";
import { SalesPage } from "@/features/sales/pages/SalesPage";
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
      { path: "inventory", element: <InventoryPage /> },
      { path: "sales", element: <SalesPage /> },
      { path: "purchases", element: <PurchasesPage /> },
      { path: "customers", element: <CustomersPage /> },
    ],
  },
]);
