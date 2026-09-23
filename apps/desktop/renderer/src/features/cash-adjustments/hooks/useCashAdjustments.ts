import { useQuery } from "@tanstack/react-query";
import { fetchCashAdjustments } from "../api/cash-adjustments.api";

export function useCashAdjustments() {
  return useQuery({
    queryKey: ["cash-adjustments"],
    queryFn: fetchCashAdjustments,
  });
}
