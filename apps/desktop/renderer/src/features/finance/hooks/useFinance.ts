import {
  DEFAULT_FINANCE_PERIOD,
  isFinancePeriodPreset,
  resolveFinancePeriod,
  type FinancePeriodPreset,
} from "@stocknegozia/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  fetchCashAdjustmentsInRange,
  fetchFinanceSummary,
  fetchPurchasesInRange,
  fetchSaleLines,
  fetchSettlements,
  fetchTopProducts,
  type FinanceRange,
} from "../api/finance.api";

/**
 * Período de las vistas de Finanzas, guardado en la URL (`?period=month`) para que al cambiar de
 * pestaña (Resumen → Ventas → Caja...) se mantenga el mismo período.
 */
export function useFinancePeriod() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("period");
  const preset: FinancePeriodPreset = isFinancePeriodPreset(raw) ? raw : DEFAULT_FINANCE_PERIOD;
  // Memo por preset: un `new Date()` por render cambiaría las queryKeys sin parar.
  const period = useMemo(() => resolveFinancePeriod(preset), [preset]);
  const setPreset = (next: FinancePeriodPreset) => {
    const nextParams = new URLSearchParams(params);
    nextParams.set("period", next);
    setParams(nextParams, { replace: true });
  };
  return { period, setPreset, search: `?period=${preset}` };
}

function rangeKey(range: FinanceRange) {
  return [range.from.toISOString(), range.to.toISOString()];
}

// Todas bajo el prefijo ["profits"]: confirmar una venta (useCreateSale) ya invalida ese prefijo.
export function useFinanceSummary(range: FinanceRange) {
  return useQuery({
    queryKey: ["profits", "finance-summary", ...rangeKey(range)],
    queryFn: () => fetchFinanceSummary(range),
  });
}

export function useTopProducts(range: FinanceRange, limit = 10) {
  return useQuery({
    queryKey: ["profits", "top-products", ...rangeKey(range), limit],
    queryFn: () => fetchTopProducts(range, limit),
  });
}

export function useSaleLines(range: FinanceRange) {
  return useQuery({
    queryKey: ["profits", "sale-lines", ...rangeKey(range)],
    queryFn: () => fetchSaleLines(range),
  });
}

export function usePendingSettlements() {
  return useQuery({
    queryKey: ["profits", "settlements", "pending"],
    queryFn: () => fetchSettlements("pending"),
  });
}

export function useSettledInRange(range: FinanceRange) {
  return useQuery({
    queryKey: ["profits", "settlements", "settled", ...rangeKey(range)],
    queryFn: () => fetchSettlements("settled", range),
  });
}

export function usePurchasesInRange(range: FinanceRange) {
  return useQuery({
    queryKey: ["purchases", "range", ...rangeKey(range)],
    queryFn: () => fetchPurchasesInRange(range),
  });
}

export function useCashAdjustmentsInRange(range: FinanceRange) {
  return useQuery({
    queryKey: ["cash-adjustments", "range", ...rangeKey(range)],
    queryFn: () => fetchCashAdjustmentsInRange(range),
  });
}
