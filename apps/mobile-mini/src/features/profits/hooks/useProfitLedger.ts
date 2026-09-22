import { useQuery } from "@tanstack/react-query";
import { fetchProfitLedger } from "@/data/profits";
import type { ProfitFilters } from "../data/repository";
import type { CashAdjustmentFilters } from "@/features/cash-adjustments/data/repository";

export function useProfitLedger(filters: ProfitFilters & CashAdjustmentFilters = {}) {
  return useQuery({
    queryKey: ["profits", "ledger", filters],
    queryFn: () => fetchProfitLedger(filters),
  });
}
