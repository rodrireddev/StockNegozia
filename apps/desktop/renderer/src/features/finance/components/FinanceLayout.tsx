import { FINANCE_PERIOD_OPTIONS } from "@stocknegozia/shared";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { TabNav } from "@/components/ui/tab-nav";
import { useFinancePeriod } from "../hooks/useFinance";

/**
 * Encabezado común de Finanzas: título, pestañas (cada vista por separado) y selector de período.
 * El período viaja en la URL, así que se conserva al cambiar de pestaña.
 */
export function FinanceLayout({ children }: { children: ReactNode }) {
  const { period, setPreset, search } = useFinancePeriod();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold">Ganancias</h1>
        <span className="text-sm text-muted-foreground">{period.label}</span>
      </div>
      <TabNav
        items={[
          { to: `/profits${search}`, label: "Resumen", end: true },
          { to: `/profits/sales${search}`, label: "Ventas" },
          { to: `/profits/purchases${search}`, label: "Compras" },
          { to: `/profits/cash${search}`, label: "Caja" },
          { to: `/profits/collections${search}`, label: "Cobros" },
        ]}
      />
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Período">
        {FINANCE_PERIOD_OPTIONS.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            role="radio"
            aria-checked={period.preset === option.value}
            variant={period.preset === option.value ? "default" : "outline"}
            onClick={() => setPreset(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
      {children}
    </div>
  );
}

export function FinanceLoading({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span>{label}</span>
    </div>
  );
}

export function FinanceError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <p className="text-sm text-muted-foreground">No se pudieron cargar los datos.</p>
      <Button variant="outline" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}

export function FinanceEmpty({ icon, message }: { icon: ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-12 text-center">
      {icon}
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
