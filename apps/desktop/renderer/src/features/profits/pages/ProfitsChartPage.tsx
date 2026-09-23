import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabNav } from "@/components/ui/tab-nav";
import { cn } from "@/lib/utils";
import { ProfitsChart } from "../components/ProfitsChart";
import { ProfitsSummary } from "../components/ProfitsSummary";
import { sumBuckets, toChartBars } from "../data/ledger";
import { useDailyProfits } from "../hooks/useDailyProfits";
import { useHourlyProfits } from "../hooks/useHourlyProfits";

const DAYS = 7;

type ChartMode = "weekly" | "daily";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

/** Parsea `YYYY-MM-DD` como fecha LOCAL, nunca UTC (mismo criterio que el backend). */
function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

/** Ganancia semanal (día vs. ganancia, últimos 7 días) y diaria (hora vs. ganancia de un día
 *  puntual) — ver `ProfitsChart`. Clickear una barra del semanal abre el detalle por hora de ese
 *  día. */
export function ProfitsChartPage() {
  const [mode, setMode] = useState<ChartMode>("weekly");
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);

  const dailyQuery = useDailyProfits(DAYS);
  const hourlyQuery = useHourlyProfits(selectedDate);

  const weekTotals = useMemo(() => sumBuckets(dailyQuery.data ?? []), [dailyQuery.data]);
  const dayTotals = useMemo(() => sumBuckets(hourlyQuery.data ?? []), [hourlyQuery.data]);
  const hourlyBars = useMemo(
    () =>
      toChartBars(hourlyQuery.data ?? [], (bucket, index) => {
        void bucket;
        return String(index);
      }),
    [hourlyQuery.data],
  );

  const dayLabel = selectedDate ? dateFormatter.format(parseDateKey(selectedDate)) : "Hoy";

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Ganancias</h1>
      <TabNav
        items={[
          { to: "/profits", label: "Historial", end: true },
          { to: "/profits/chart", label: "Gráfico" },
        ]}
      />

      <div className="flex gap-2">
        {(
          [
            { value: "weekly" as const, label: "Semanal" },
            { value: "daily" as const, label: "Diario" },
          ]
        ).map((tab) => (
          <Button
            key={tab.value}
            type="button"
            variant={mode === tab.value ? "default" : "outline"}
            size="sm"
            onClick={() => setMode(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {mode === "weekly" ? (
        dailyQuery.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Cargando gráfico…</span>
          </div>
        ) : dailyQuery.isError ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-muted-foreground">No se pudo cargar el gráfico.</p>
            <Button variant="outline" onClick={() => dailyQuery.refetch()}>
              Reintentar
            </Button>
          </div>
        ) : (
          dailyQuery.data && (
            <>
              <ProfitsSummary {...weekTotals} />
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground">
                    Últimos 7 días · hacé click en un día para ver el detalle
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ProfitsChart
                    data={dailyQuery.data}
                    onSelectDay={(date) => {
                      setSelectedDate(date);
                      setMode("daily");
                    }}
                  />
                </CardContent>
              </Card>
            </>
          )
        )
      ) : hourlyQuery.isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Cargando gráfico…</span>
        </div>
      ) : hourlyQuery.isError ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-muted-foreground">No se pudo cargar el gráfico.</p>
          <Button variant="outline" onClick={() => hourlyQuery.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : (
        hourlyQuery.data && (
          <>
            <ProfitsSummary {...dayTotals} />
            <Card>
              <CardHeader className={cn("flex-row items-center justify-between space-y-0")}>
                <CardTitle className="text-sm text-muted-foreground">{dayLabel} · por hora</CardTitle>
                {selectedDate && (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedDate(undefined)}>
                    Volver a hoy
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <ProfitsChart data={hourlyBars} />
              </CardContent>
            </Card>
          </>
        )
      )}
    </div>
  );
}
