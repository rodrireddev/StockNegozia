import { Loader2 } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabNav } from "@/components/ui/tab-nav";
import { ProfitsChart } from "../components/ProfitsChart";
import { ProfitsSummary, sumProfitEntries } from "../components/ProfitsSummary";
import { useDailyProfits } from "../hooks/useDailyProfits";

const DAYS = 7;

/** Ganancia día vs. ganancia de ese día para la última semana — ver `ProfitsChart`. */
export function ProfitsChartPage() {
  const { data, isLoading, isError, refetch } = useDailyProfits(DAYS);
  const totals = useMemo(() => sumProfitEntries(data ?? []), [data]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Ganancias</h1>
      <TabNav
        items={[
          { to: "/profits", label: "Historial", end: true },
          { to: "/profits/chart", label: "Gráfico semanal" },
        ]}
      />

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Cargando gráfico…</span>
        </div>
      )}

      {isError && !isLoading && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-muted-foreground">No se pudo cargar el gráfico.</p>
          <Button variant="outline" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      )}

      {!isLoading && !isError && data && (
        <>
          <ProfitsSummary {...totals} />
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Últimos 7 días</CardTitle>
            </CardHeader>
            <CardContent>
              <ProfitsChart data={data} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
