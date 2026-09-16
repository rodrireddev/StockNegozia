import { useQuery } from "@tanstack/react-query";
import { fetchStockMovements, type StockMovementQuery } from "@/data/stock-movements";

export function useStockMovements(query: StockMovementQuery) {
  return useQuery({
    queryKey: ["stock-movements", query],
    queryFn: () => fetchStockMovements(query),
  });
}
