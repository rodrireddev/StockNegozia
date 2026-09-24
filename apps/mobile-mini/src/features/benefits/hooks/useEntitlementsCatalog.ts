import { useQuery } from "@tanstack/react-query";
import { fetchEntitlementsCatalog } from "@/accounts/api/entitlements.api";

export function useEntitlementsCatalog() {
  return useQuery({
    queryKey: ["entitlements", "catalog"],
    queryFn: fetchEntitlementsCatalog,
  });
}
