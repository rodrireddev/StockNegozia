import { createBrowserRouter } from "react-router-dom";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { CreditConfigPage } from "@/features/credit-config/pages/CreditConfigPage";
import { RequireAdminSession } from "./RequireAdminSession";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: <RequireAdminSession />,
    children: [{ index: true, element: <CreditConfigPage /> }],
  },
]);
