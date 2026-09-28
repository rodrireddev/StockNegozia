import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { AccountProvider } from "@/features/benefits/AccountContext";
import { queryClient } from "@/lib/query-client";
import { router } from "./router";

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AccountProvider>
        <RouterProvider router={router} />
      </AccountProvider>
    </QueryClientProvider>
  );
}
