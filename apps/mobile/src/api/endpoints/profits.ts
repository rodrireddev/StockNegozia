import type { DailyProfitDto, HourlyProfitDto, ProfitLedgerEntryDto } from "@stocknegozia/api-contracts";
import { apiGet } from "@/api/client";

export interface ProfitQuery {
  productId?: number;
  from?: Date;
  to?: Date;
}

function toQueryString(query: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/** `GET /profits/ledger` — historial combinado (ventas + ajustes de caja), lo que efectivamente
 *  muestra "Historial" en la pantalla de Ganancias. `from`/`to` sólo los usa el detalle de un día
 *  puntual (ver `DayProfitView`) — el resto de la pantalla no filtra por fecha. */
export function fetchProfitLedger(query: ProfitQuery = {}): Promise<ProfitLedgerEntryDto[]> {
  return apiGet<ProfitLedgerEntryDto[]>(
    `/profits/ledger${toQueryString({
      productId: query.productId,
      from: query.from?.toISOString(),
      to: query.to?.toISOString(),
    })}`,
  );
}

/** `GET /profits/daily` — agregado día vs. ganancia para el gráfico semanal. */
export function fetchDailyProfits(days: number): Promise<DailyProfitDto[]> {
  return apiGet<DailyProfitDto[]>(`/profits/daily${toQueryString({ days })}`);
}

/** `GET /profits/hourly` — agregado hora vs. ganancia de UN día, para el gráfico diario. `date` en
 *  formato `YYYY-MM-DD`; sin especificar, el backend usa el día de hoy. */
export function fetchHourlyProfits(date?: string): Promise<HourlyProfitDto[]> {
  return apiGet<HourlyProfitDto[]>(`/profits/hourly${toQueryString({ date })}`);
}
