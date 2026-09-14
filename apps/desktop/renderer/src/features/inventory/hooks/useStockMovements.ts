import { useQuery } from "@tanstack/react-query";
import { fetchStockMovements, type StockMovementQuery } from "../api/stock-movements.api";

export function useStockMovements(query: StockMovementQuery) {
  return useQuery({
    queryKey: ["stock-movements", query],
    queryFn: () => fetchStockMovements(query),
  });
}
