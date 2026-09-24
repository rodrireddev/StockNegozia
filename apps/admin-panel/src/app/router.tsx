import { createBrowserRouter } from "react-router-dom";
import { AdPlacementsPage } from "@/features/ads/pages/AdPlacementsPage";
import { HouseAdsPage } from "@/features/ads/pages/HouseAdsPage";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { CreditConfigPage } from "@/features/credit-config/pages/CreditConfigPage";
import { AdminLayout } from "./AdminLayout";
import { RequireAdminSession } from "./RequireAdminSession";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: <RequireAdminSession />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <CreditConfigPage /> },
          { path: "ad-placements", element: <AdPlacementsPage /> },
          { path: "house-ads", element: <HouseAdsPage /> },
        ],
      },
    ],
  },
]);
