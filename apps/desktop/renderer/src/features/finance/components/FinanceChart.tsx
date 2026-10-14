import type { FinanceSeriesPointDto } from "@stocknegozia/api-contracts";
import { buildChartScale, formatMoney, formatMoneyCompact } from "@stocknegozia/shared";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type FinanceChartMetric = "profit" | "revenue" | "purchases" | "withdrawals";

const METRIC_BAR_CLASS: Record<FinanceChartMetric, string> = {
  profit: "bg-success",
  revenue: "bg-primary",
  purchases: "bg-warning",
  withdrawals: "bg-destructive",
};

/** Filas del tooltip según la serie: ventas muestran el desglose; compras/retiros, su valor. */
const TOOLTIP_ROWS: Record<
  FinanceChartMetric,
  { key: keyof FinanceSeriesPointDto; label: string }[]
> = {
  profit: [
    { key: "revenue", label: "Vendido" },
    { key: "cost", label: "Costo" },
    { key: "profit", label: "Ganancia" },
  ],
  revenue: [
    { key: "revenue", label: "Vendido" },
    { key: "cost", label: "Costo" },
    { key: "profit", label: "Ganancia" },
  ],
  purchases: [{ key: "purchases", label: "Compras" }],
  withdrawals: [{ key: "withdrawals", label: "Retiros" }],
};

const PLOT_HEIGHT = 220;
/** Con más barras que esto (24 horas, 30 días) no entra el valor arriba de cada una. */
const MAX_BARS_WITH_VALUE_LABEL = 12;

interface FinanceChartProps {
  data: FinanceSeriesPointDto[];
  metric: FinanceChartMetric;
}

/**
 * Barras del período (por hora o por día) sin librería: escala "linda" (`buildChartScale`), eje
 * Y, líneas guía, valores compactos y tooltip con el valor completo. La ganancia puede ser
 * negativa (vender por debajo del costo): el cero queda a mitad de altura.
 */
export function FinanceChart({ data, metric }: FinanceChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const scale = buildChartScale(data.map((point) => point[metric]));
  const range = scale.max - scale.min || 1;
  const toY = (value: number) => ((scale.max - value) / range) * PLOT_HEIGHT;
  const zeroY = toY(0);
  const showValueLabels = data.length <= MAX_BARS_WITH_VALUE_LABEL;
  // Etiquetas del eje X espaciadas para que nunca se pisen (24 horas, 31 días).
  const xLabelEvery = Math.max(1, Math.ceil(data.length / 8));
  const active = activeIndex !== null ? data[activeIndex] : undefined;

  return (
    <div className="flex gap-2" onMouseLeave={() => setActiveIndex(null)}>
      <div className="relative w-16 shrink-0" style={{ height: PLOT_HEIGHT }} aria-hidden>
        {scale.ticks.map((tick) => (
          <span
            key={tick}
            className="absolute right-0 -translate-y-1/2 text-[11px] tabular-nums text-muted-foreground"
            style={{ top: toY(tick) }}
          >
            {formatMoneyCompact(tick)}
          </span>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <div className="relative" style={{ height: PLOT_HEIGHT }}>
          {scale.ticks.map((tick) => (
            <div
              key={tick}
              className={cn("absolute inset-x-0 h-px bg-border", tick !== 0 && "opacity-50")}
              style={{ top: toY(tick) }}
            />
          ))}

          <div className="absolute inset-0 flex gap-0.5">
            {data.map((point, index) => {
              const value = point[metric];
              const top = value >= 0 ? toY(value) : zeroY;
              const height = Math.max(value === 0 ? 0 : 2, Math.abs(toY(value) - zeroY));
              const isActive = activeIndex === index;
              return (
                <div
                  key={point.key}
                  role="img"
                  tabIndex={0}
                  aria-label={`${point.label}: ${formatMoney(value)}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onFocus={() => setActiveIndex(index)}
                  onBlur={() => setActiveIndex(null)}
                  className={cn(
                    "relative h-full min-w-0 flex-1 rounded-sm",
                    isActive && "bg-accent",
                  )}
                >
                  {showValueLabels && value !== 0 && (
                    <span
                      className="absolute inset-x-0 truncate text-center text-[10px] leading-none tabular-nums text-muted-foreground"
                      style={value > 0 ? { top: top - 14 } : { top: top + height + 4 }}
                    >
                      {formatMoneyCompact(value)}
                    </span>
                  )}
                  <span
                    className={cn(
                      "absolute left-1/2 w-3/5 max-w-10 -translate-x-1/2 transition-opacity",
                      value >= 0 ? "rounded-t-sm" : "rounded-b-sm",
                      value < 0 ? "bg-destructive" : METRIC_BAR_CLASS[metric],
                      activeIndex !== null && !isActive && "opacity-60",
                    )}
                    style={{ top, height }}
                  />
                </div>
              );
            })}
          </div>

          {active && activeIndex !== null && (
            <div
              className={cn(
                "pointer-events-none absolute z-10 w-max rounded-md border border-border bg-background px-3 py-2 text-xs shadow-md",
                activeIndex < data.length / 4
                  ? "translate-x-0"
                  : activeIndex >= (data.length * 3) / 4
                    ? "-translate-x-full"
                    : "-translate-x-1/2",
              )}
              style={{ left: `${((activeIndex + 0.5) / data.length) * 100}%`, top: 0 }}
              role="tooltip"
            >
              <p className="mb-1 font-medium">{active.label}</p>
              {TOOLTIP_ROWS[metric].map((row) => {
                const value = active[row.key] as number;
                const highlight =
                  row.key === metric || (metric === "revenue" && row.key === "profit");
                return (
                  <p key={row.key} className="flex justify-between gap-4 tabular-nums">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span
                      className={cn(
                        highlight && "font-semibold",
                        row.key === "profit" && (value < 0 ? "text-destructive" : "text-success"),
                      )}
                    >
                      {formatMoney(value)}
                    </span>
                  </p>
                );
              })}
            </div>
          )}
        </div>

        {/* Etiquetas centradas en su barra con ancho propio: en una tarjeta angosta cada columna
            mide pocos píxeles y "10h" no entraría dentro de ella. */}
        <div className="relative mt-1 h-4">
          {data.map((point, index) =>
            index % xLabelEvery === 0 || activeIndex === index ? (
              <span
                key={point.key}
                className={cn(
                  "absolute w-10 -translate-x-1/2 whitespace-nowrap text-center text-xs text-muted-foreground",
                  activeIndex === index && "font-medium text-foreground",
                )}
                style={{ left: `${((index + 0.5) / data.length) * 100}%` }}
              >
                {point.label}
              </span>
            ) : null,
          )}
        </div>
      </div>
    </div>
  );
}
