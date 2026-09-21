import { useQuery } from "@tanstack/react-query";
import { fetchProfits, type ProfitQuery } from "../api/profits.api";

export function useProfits(query: ProfitQuery) {
  return useQuery({
    queryKey: ["profits", query],
    queryFn: () => fetchProfits(query),
  });
}
