import { useQuery } from "@tanstack/react-query";
import { fetchProfits } from "@/data/profits";
import type { ProfitFilters } from "@/features/profits/data/repository";

export function useProfits(filters: ProfitFilters = {}) {
  return useQuery({
    queryKey: ["profits", filters],
    queryFn: () => fetchProfits(filters),
  });
}
