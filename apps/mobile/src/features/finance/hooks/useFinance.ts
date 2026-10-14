import { useMemo } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  DEFAULT_FINANCE_PERIOD,
  isFinancePeriodPreset,
  resolveFinancePeriod,
  type FinancePeriod,
  type FinancePeriodPreset,
} from "@stocknegozia/shared";
import {
  fetchCashAdjustmentsInRange,
  fetchFinanceSummary,
  fetchPurchasesInRange,
  fetchSaleLines,
  fetchSettlements,
  fetchTopProducts,
} from "@/api/endpoints/finance";
import { useAuthErrorRedirect } from "@/auth/useAuthErrorRedirect";

/**
 * Período de Ganancias en el parámetro de ruta (`?period=month`): el hub y cada vista de detalle
 * comparten el mismo período sin estado global. Mismo archivo en `apps/mobile-mini` (sólo cambia
 * de dónde se leen los datos).
 */
export function useFinancePeriod(): {
  period: FinancePeriod;
  setPreset: (preset: FinancePeriodPreset) => void;
} {
  const params = useLocalSearchParams<{ period?: string }>();
  const router = useRouter();
  const preset = isFinancePeriodPreset(params.period) ? params.period : DEFAULT_FINANCE_PERIOD;
  // Memo por preset: un `new Date()` por render cambiaría las queryKeys sin parar.
  const period = useMemo(() => resolveFinancePeriod(preset), [preset]);
  return { period, setPreset: (next) => router.setParams({ period: next }) };
}

function rangeKey(range: { from: Date; to: Date }) {
  return [range.from.toISOString(), range.to.toISOString()];
}

/** Todas bajo el prefijo ["profits"]: confirmar una venta (useCreateSale) invalida ese prefijo. */
function useFinanceQuery<T>(key: unknown[], fetcher: () => Promise<T>) {
  const query = useQuery({ queryKey: ["profits", ...key], queryFn: fetcher });
  useAuthErrorRedirect(query.error);
  return query;
}

export function useFinanceSummary(range: { from: Date; to: Date }) {
  return useFinanceQuery(["finance-summary", ...rangeKey(range)], () => fetchFinanceSummary(range));
}

export function useTopProducts(range: { from: Date; to: Date }, limit = 5) {
  return useFinanceQuery(["top-products", ...rangeKey(range), limit], () =>
    fetchTopProducts(range, limit),
  );
}

export function useSaleLines(range: { from: Date; to: Date }) {
  return useFinanceQuery(["sale-lines", ...rangeKey(range)], () => fetchSaleLines(range));
}

export function usePendingSettlements() {
  return useFinanceQuery(["settlements", "pending"], () => fetchSettlements("pending"));
}

export function usePurchasesInRange(range: { from: Date; to: Date }) {
  return useFinanceQuery(["purchases", ...rangeKey(range)], () => fetchPurchasesInRange(range));
}

export function useCashAdjustmentsInRange(range: { from: Date; to: Date }) {
  return useFinanceQuery(["cash", ...rangeKey(range)], () => fetchCashAdjustmentsInRange(range));
}
