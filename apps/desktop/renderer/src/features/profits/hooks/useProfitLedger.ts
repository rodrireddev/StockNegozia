import { useQuery } from "@tanstack/react-query";
import { fetchProfitLedger, type ProfitQuery } from "../api/profits.api";

export function useProfitLedger(query: ProfitQuery) {
  return useQuery({
    queryKey: ["profits", "ledger", query],
    queryFn: () => fetchProfitLedger(query),
  });
}
