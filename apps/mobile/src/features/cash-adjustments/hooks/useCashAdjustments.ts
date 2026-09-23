import { useQuery } from "@tanstack/react-query";
import { fetchCashAdjustments } from "@/api/endpoints/cash-adjustments";

export function useCashAdjustments() {
  return useQuery({
    queryKey: ["cash-adjustments"],
    queryFn: fetchCashAdjustments,
  });
}
