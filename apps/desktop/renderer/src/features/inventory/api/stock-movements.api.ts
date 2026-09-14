import type { StockMovementDto } from "@stocknegozia/api-contracts";
import { apiGet } from "@/lib/api-client";

export interface StockMovementQuery {
  productId?: number;
  type?: string;
  direction?: string;
}

function toQueryString(query: StockMovementQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function fetchStockMovements(query: StockMovementQuery): Promise<StockMovementDto[]> {
  return apiGet<StockMovementDto[]>(`/stock-movements${toQueryString(query)}`);
}
