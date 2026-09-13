import type { HealthStatus } from "@stocknegozia/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => apiGet<HealthStatus>("/health"),
    refetchInterval: 15_000,
  });
}
