import type { DailyProfitDto, HourlyProfitDto, ProfitLedgerEntryDto } from "@stocknegozia/api-contracts";
import { apiGet } from "@/lib/api-client";

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

/** Historial combinado (ventas + ajustes de caja) — lo que efectivamente muestra "Historial". */
export function fetchProfitLedger(query: ProfitQuery): Promise<ProfitLedgerEntryDto[]> {
  return apiGet<ProfitLedgerEntryDto[]>(`/profits/ledger${toQueryString({ productId: query.productId })}`);
}

export function fetchDailyProfits(days: number): Promise<DailyProfitDto[]> {
  return apiGet<DailyProfitDto[]>(`/profits/daily${toQueryString({ days })}`);
}

/** `date` en formato `YYYY-MM-DD` — sin especificar, el backend usa el día de hoy. */
export function fetchHourlyProfits(date?: string): Promise<HourlyProfitDto[]> {
  return apiGet<HourlyProfitDto[]>(`/profits/hourly${toQueryString({ date })}`);
}
