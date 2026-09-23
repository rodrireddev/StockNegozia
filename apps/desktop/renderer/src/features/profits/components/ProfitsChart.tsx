import type { DailyProfitDto } from "@stocknegozia/api-contracts";
import { cn } from "@/lib/utils";

const POSITIVE_ZONE_HEIGHT = 110;
const NEGATIVE_ZONE_HEIGHT = 40;

const compactCurrencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

interface ProfitsChartProps {
  data: DailyProfitDto[];
  /** Al hacer click en un día se llama con su `date` (`YYYY-MM-DD`) — pensado para abrir el
   *  detalle de ese día. Sin esta prop las barras no son clickeables. */
  onSelectDay?: (date: string) => void;
}

/**
 * Barras día vs. ganancia de la última semana — sin librería de gráficos (no hay ninguna en el
 * proyecto), sólo `div`s con alto proporcional. Eje cero fijo entre dos "zonas" (positiva arriba,
 * negativa abajo) para poder mostrar un día con pérdida sin distorsionar la escala de los demás —
 * un solo `maxAbsProfit` comparte la escala de ambas zonas. Misma estructura que
 * `apps/mobile-mini/src/features/profits/components/ProfitChart.tsx`.
 */
export function ProfitsChart({ data, onSelectDay }: ProfitsChartProps) {
  const hasNegative = data.some((day) => day.profit < 0);
  const maxAbsProfit = Math.max(1, ...data.map((day) => Math.abs(day.profit)));

  return (
    <div className="space-y-1">
      <div className="flex items-end gap-2" style={{ height: POSITIVE_ZONE_HEIGHT }}>
        {data.map((day) => {
          const barHeight =
            day.profit > 0
              ? Math.max(4, (day.profit / maxAbsProfit) * (POSITIVE_ZONE_HEIGHT - 20))
              : 2;
          return (
            <button
              key={day.date}
              type="button"
              disabled={!onSelectDay}
              onClick={() => onSelectDay?.(day.date)}
              className={cn(
                "flex flex-1 flex-col items-center justify-end gap-1",
                onSelectDay && "cursor-pointer rounded-sm hover:bg-accent",
              )}
            >
              <span className="text-[10px] leading-none text-muted-foreground">
                {day.profit !== 0 ? compactCurrencyFormatter.format(day.profit) : ""}
              </span>
              <div
                className={cn("w-3/5 rounded-t-sm", day.profit === 0 ? "bg-border" : "bg-success")}
                style={{ height: barHeight }}
              />
            </button>
          );
        })}
      </div>

      <div className="h-px bg-border" />

      {hasNegative && (
        <div className="flex gap-2" style={{ height: NEGATIVE_ZONE_HEIGHT }}>
          {data.map((day) => {
            const barHeight =
              day.profit < 0
                ? Math.max(4, (Math.abs(day.profit) / maxAbsProfit) * (NEGATIVE_ZONE_HEIGHT - 4))
                : 0;
            return (
              <div key={day.date} className="flex flex-1 justify-center">
                {barHeight > 0 && (
                  <div className="w-3/5 rounded-b-sm bg-destructive" style={{ height: barHeight }} />
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        {data.map((day) => (
          <button
            key={day.date}
            type="button"
            disabled={!onSelectDay}
            onClick={() => onSelectDay?.(day.date)}
            className={cn(
              "flex-1 text-center text-xs text-muted-foreground",
              onSelectDay && "cursor-pointer rounded-sm hover:bg-accent hover:text-foreground",
            )}
          >
            {day.label}
          </button>
        ))}
      </div>
    </div>
  );
}
