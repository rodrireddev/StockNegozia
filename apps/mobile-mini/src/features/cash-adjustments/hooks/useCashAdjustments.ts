import { useQuery } from "@tanstack/react-query";
import { fetchCashAdjustments } from "@/data/cash-adjustments";
import type { CashAdjustmentFilters } from "../data/repository";

export function useCashAdjustments(filters: CashAdjustmentFilters = {}) {
  return useQuery({
    queryKey: ["cash-adjustments", filters],
    queryFn: () => fetchCashAdjustments(filters),
  });
}
