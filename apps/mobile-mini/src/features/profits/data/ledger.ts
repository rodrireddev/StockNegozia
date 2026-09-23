import { cashAdjustmentsService, type CashAdjustmentDto } from "@/features/cash-adjustments/data/service";
import type { CashAdjustmentFilters } from "@/features/cash-adjustments/data/repository";
import { profitsService, type DailyProfitDto, type ProfitEntryDto } from "./service";
import type { ProfitFilters } from "./repository";

export type ProfitLedgerEntry =
  | ({ kind: "sale" } & ProfitEntryDto)
  | ({ kind: "cashAdjustment" } & CashAdjustmentDto);

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** La ganancia "neta" de una línea del historial combinado — para una venta es su margen; para
 *  un ajuste de caja es el monto con signo (un retiro resta, un ingreso suma). */
export function ledgerEntryProfit(entry: ProfitLedgerEntry): number {
  if (entry.kind === "sale") return entry.profit;
  return entry.direction === "IN" ? entry.amount : -entry.amount;
}

/** Totales de un conjunto de líneas del historial combinado — `revenue`/`cost` sólo suman ventas
 *  (ver comentario de `findDailySummary`), `profit` incluye también los ajustes de caja. */
export function sumLedgerEntries(entries: ProfitLedgerEntry[]) {
  return entries.reduce(
    (acc, entry) => ({
      revenue: roundMoney(acc.revenue + (entry.kind === "sale" ? entry.revenue : 0)),
      cost: roundMoney(acc.cost + (entry.kind === "sale" ? entry.cost : 0)),
      profit: roundMoney(acc.profit + ledgerEntryProfit(entry)),
    }),
    { revenue: 0, cost: 0, profit: 0 },
  );
}

export interface HourlyProfitDto {
  /** 0-23, hora local del dispositivo. */
  hour: number;
  /** Ej: "14h" — listo para el eje X del gráfico. */
  label: string;
  revenue: number;
  cost: number;
  profit: number;
}

/**
 * Agrupa por hora del día (0 a 23) un conjunto de líneas del historial combinado que YA vienen
 * acotadas a un único día — a diferencia de `findDailySummary` (que arma su propio rango de
 * fechas y consulta la base), esta es una función pura sobre entradas ya cargadas: la pantalla de
 * detalle de un día ya tiene esas entradas en memoria (`useProfitLedger({ from, to })`), así que
 * no hace falta una consulta nueva sólo para reagruparlas por hora en vez de por día.
 */
export function bucketEntriesByHour(entries: ProfitLedgerEntry[]): HourlyProfitDto[] {
  const byHour = new Map<number, { revenue: number; cost: number; profit: number }>();
  for (const entry of entries) {
    const hour = new Date(entry.createdAt).getHours();
    const bucket = byHour.get(hour) ?? { revenue: 0, cost: 0, profit: 0 };
    if (entry.kind === "sale") {
      bucket.revenue = roundMoney(bucket.revenue + entry.revenue);
      bucket.cost = roundMoney(bucket.cost + entry.cost);
    }
    bucket.profit = roundMoney(bucket.profit + ledgerEntryProfit(entry));
    byHour.set(hour, bucket);
  }

  const result: HourlyProfitDto[] = [];
  for (let hour = 0; hour < 24; hour++) {
    const bucket = byHour.get(hour) ?? { revenue: 0, cost: 0, profit: 0 };
    result.push({ hour, label: `${hour}h`, ...bucket });
  }
  return result;
}

/** Totales de un conjunto de días ya agregados (`findDailySummary`) — cada día ya trae su propio
 *  `revenue`/`cost`/`profit` combinado, así que acá alcanza con sumarlos directo. */
export function sumDailyProfits(days: DailyProfitDto[]) {
  return days.reduce(
    (acc, day) => ({
      revenue: roundMoney(acc.revenue + day.revenue),
      cost: roundMoney(acc.cost + day.cost),
      profit: roundMoney(acc.profit + day.profit),
    }),
    { revenue: 0, cost: 0, profit: 0 },
  );
}

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function toDateKey(date: Date): string {
  const local = startOfDay(date);
  const year = local.getFullYear();
  const month = String(local.getMonth() + 1).padStart(2, "0");
  const day = String(local.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Rango [00:00:00.000, 23:59:59.999] del día LOCAL que contiene `date` — mismo rango que usan
 *  tanto la vista "Diario" (hoy) como el detalle de un día pasado (`ProfitDayDetailScreen`). */
export function dayBounds(date: Date): { from: Date; to: Date } {
  const from = startOfDay(date);
  const to = new Date(from);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

/** Parsea una clave `YYYY-MM-DD` (mismo formato que `DailyProfitDto.date`) como fecha LOCAL, nunca
 *  UTC — un `new Date("YYYY-MM-DD")` directo interpretaría la fecha en UTC y podría mostrar el día
 *  anterior/siguiente según la zona horaria del dispositivo. */
export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

/**
 * Combina ventas (`profitsService`) y movimientos de caja (`cashAdjustmentsService`) en un único
 * historial ordenado — ver comentario en `database/schema/cash-adjustments.ts` sobre por qué son
 * dos tablas separadas que sólo se juntan acá, en la capa de lectura. Filtrar por `productId` sólo
 * tiene sentido para ventas (un ajuste de caja no está atado a ningún producto), así que en ese
 * caso los ajustes se excluyen del todo en vez de listarlos sin filtrar.
 */
export const profitLedgerService = {
  findMany(filters: ProfitFilters & CashAdjustmentFilters = {}): ProfitLedgerEntry[] {
    const sales: ProfitLedgerEntry[] = profitsService
      .findMany(filters)
      .map((entry) => ({ kind: "sale" as const, ...entry }));

    if (filters.productId !== undefined) return sales;

    const adjustments: ProfitLedgerEntry[] = cashAdjustmentsService
      .findMany(filters)
      .map((entry) => ({ kind: "cashAdjustment" as const, ...entry }));

    return [...sales, ...adjustments].sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
  },

  /**
   * Mismo agrupado por día que antes hacía `profitsService.findDailySummary`, pero sumando también
   * el impacto de los ajustes de caja en `profit` — nunca en `revenue`/`cost`, que siguen siendo
   * pura economía de venta (ver docs del schema). Un retiro grande un día de pocas ventas resta de
   * "Ganancia" ese día sin ensuciar "Vendido"/"Costo".
   */
  findDailySummary(days = 7): DailyProfitDto[] {
    const today = startOfDay(new Date());
    const from = new Date(today);
    from.setDate(from.getDate() - (days - 1));

    const entries = profitLedgerService.findMany({ from });

    const byDate = new Map<string, { revenue: number; cost: number; profit: number }>();
    for (const entry of entries) {
      const key = toDateKey(new Date(entry.createdAt));
      const bucket = byDate.get(key) ?? { revenue: 0, cost: 0, profit: 0 };
      if (entry.kind === "sale") {
        bucket.revenue = roundMoney(bucket.revenue + entry.revenue);
        bucket.cost = roundMoney(bucket.cost + entry.cost);
      }
      bucket.profit = roundMoney(bucket.profit + ledgerEntryProfit(entry));
      byDate.set(key, bucket);
    }

    const result: DailyProfitDto[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(from);
      date.setDate(date.getDate() + i);
      const key = toDateKey(date);
      const bucket = byDate.get(key) ?? { revenue: 0, cost: 0, profit: 0 };
      result.push({ date: key, label: DAY_LABELS[date.getDay()] ?? "", ...bucket });
    }
    return result;
  },
};
