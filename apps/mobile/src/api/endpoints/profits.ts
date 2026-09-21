import type { DailyProfitDto, ProfitEntryDto } from "@stocknegozia/api-contracts";
import { apiGet } from "@/api/client";

export interface ProfitQuery {
  productId?: number;
}

function toQueryString(query: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/** `GET /profits` — mismo criterio que `fetchStockMovements`. */
export function fetchProfits(query: ProfitQuery = {}): Promise<ProfitEntryDto[]> {
  return apiGet<ProfitEntryDto[]>(`/profits${toQueryString({ productId: query.productId })}`);
}

/** `GET /profits/daily` — agregado día vs. ganancia para el gráfico semanal. */
export function fetchDailyProfits(days: number): Promise<DailyProfitDto[]> {
  return apiGet<DailyProfitDto[]>(`/profits/daily${toQueryString({ days })}`);
}
