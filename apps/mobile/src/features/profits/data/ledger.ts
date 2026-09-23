import type { ProfitLedgerEntryDto } from "@stocknegozia/api-contracts";

export type { ProfitLedgerEntryDto };

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** La ganancia "neta" de una línea del historial combinado — para una venta es su margen; para
 *  un ajuste de caja es el monto con signo (un retiro resta, un ingreso suma). */
export function ledgerEntryProfit(entry: ProfitLedgerEntryDto): number {
  if (entry.kind === "sale") return entry.profit;
  return entry.direction === "IN" ? entry.amount : -entry.amount;
}

/** Totales de un conjunto de líneas del historial combinado — `revenue`/`cost` sólo suman ventas
 *  (pura economía de venta), `profit` incluye también los ajustes de caja. */
export function sumLedgerEntries(entries: ProfitLedgerEntryDto[]) {
  return entries.reduce(
    (acc, entry) => ({
      revenue: roundMoney(acc.revenue + (entry.kind === "sale" ? entry.revenue : 0)),
      cost: roundMoney(acc.cost + (entry.kind === "sale" ? entry.cost : 0)),
      profit: roundMoney(acc.profit + ledgerEntryProfit(entry)),
    }),
    { revenue: 0, cost: 0, profit: 0 },
  );
}

/** Totales de un conjunto de días/horas ya agregados (`DailyProfitDto`/`HourlyProfitDto`) — cada
 *  bucket ya trae su propio `revenue`/`cost`/`profit` combinado. */
export function sumBuckets(buckets: { revenue: number; cost: number; profit: number }[]) {
  return buckets.reduce(
    (acc, bucket) => ({
      revenue: roundMoney(acc.revenue + bucket.revenue),
      cost: roundMoney(acc.cost + bucket.cost),
      profit: roundMoney(acc.profit + bucket.profit),
    }),
    { revenue: 0, cost: 0, profit: 0 },
  );
}
