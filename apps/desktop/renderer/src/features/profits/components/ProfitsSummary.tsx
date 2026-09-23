import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const currencyFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

interface ProfitsSummaryProps {
  revenue: number;
  cost: number;
  profit: number;
}

/** Totales de un conjunto de líneas de ganancia (el historial filtrado, o la semana del gráfico) —
 *  misma etiqueta SIEMPRE arriba del valor que `ProfitsTable`, para que no se confunda "Ganancia"
 *  con "Vendido". */
export function ProfitsSummary({ revenue, cost, profit }: ProfitsSummaryProps) {
  return (
    <Card>
      <CardContent className="flex gap-8 p-4">
        <div>
          <p className="text-xs text-muted-foreground">Vendido</p>
          <p className="text-lg font-semibold tabular-nums">{currencyFormatter.format(revenue)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Costo</p>
          <p className="text-lg font-semibold tabular-nums">{currencyFormatter.format(cost)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Ganancia</p>
          <p
            className={cn(
              "text-lg font-semibold tabular-nums",
              profit < 0 ? "text-destructive" : "text-success",
            )}
          >
            {currencyFormatter.format(profit)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
