import { describeMovementActor, describePaymentMethods, formatMoney } from "@stocknegozia/shared";
import { TrendingUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { FinanceChart } from "../components/FinanceChart";
import {
  FinanceEmpty,
  FinanceError,
  FinanceLayout,
  FinanceLoading,
} from "../components/FinanceLayout";
import { Stat, StatsCard } from "../components/Stat";
import {
  useFinancePeriod,
  useFinanceSummary,
  useSaleLines,
  useTopProducts,
} from "../hooks/useFinance";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" });

/** "Lo que se ganó vendiendo": vendido, costo, ganancia y margen; gráfico; los productos que más
 *  ganancia dejaron; y el detalle por línea de venta. Sin ajustes de caja ni compras. */
export function FinanceSalesPage() {
  const { period } = useFinancePeriod();
  const summary = useFinanceSummary(period);
  const topProducts = useTopProducts(period, 8);
  const lines = useSaleLines(period);
  const [metric, setMetric] = useState<"profit" | "revenue">("profit");

  return (
    <FinanceLayout>
      {summary.isLoading ? (
        <FinanceLoading />
      ) : summary.isError || !summary.data ? (
        <FinanceError onRetry={() => void summary.refetch()} />
      ) : summary.data.sales.count === 0 ? (
        <FinanceEmpty
          icon={<TrendingUp className="h-10 w-10 text-muted-foreground" />}
          message="No hay ventas en este período."
        />
      ) : (
        <>
          <StatsCard columns={4}>
            <Stat label="Vendido" value={summary.data.sales.revenue} large />
            <Stat label="Costo de lo vendido" value={summary.data.sales.cost} large />
            <Stat
              label="Ganancia"
              value={summary.data.sales.profit}
              tone={summary.data.sales.profit < 0 ? "negative" : "positive"}
              hint={`Margen ${summary.data.sales.marginPercent}%`}
              large
            />
            <Stat
              label="Ticket promedio"
              value={summary.data.sales.averageTicket}
              hint={`${summary.data.sales.count} ventas · ${summary.data.sales.unitsSold} unidades`}
              large
            />
          </StatsCard>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm text-muted-foreground">
                {metric === "profit" ? "Ganancia" : "Vendido"} ·{" "}
                {summary.data.granularity === "hour" ? "por hora" : "por día"}
              </CardTitle>
              <div className="flex gap-1 rounded-md border border-border p-0.5">
                {(["profit", "revenue"] as const).map((option) => (
                  <Button
                    key={option}
                    type="button"
                    size="sm"
                    className="h-7"
                    variant={metric === option ? "secondary" : "ghost"}
                    onClick={() => setMetric(option)}
                  >
                    {option === "profit" ? "Ganancia" : "Vendido"}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <FinanceChart data={summary.data.series} metric={metric} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                Productos que más ganancia dejaron
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topProducts.isLoading ? (
                <FinanceLoading />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Unidades</TableHead>
                      <TableHead className="text-right">Vendido</TableHead>
                      <TableHead className="text-right">Ganancia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(topProducts.data ?? []).map((product) => (
                      <TableRow key={product.productId}>
                        <TableCell className="font-medium">{product.productName}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {product.quantity}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoney(product.revenue)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-medium tabular-nums",
                            product.profit < 0 ? "text-destructive" : "text-success",
                          )}
                        >
                          {formatMoney(product.profit)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Detalle de ventas</CardTitle>
            </CardHeader>
            <CardContent>
              {lines.isLoading ? (
                <FinanceLoading />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Cant.</TableHead>
                      <TableHead className="text-right">Vendido</TableHead>
                      <TableHead className="text-right">Costo</TableHead>
                      <TableHead className="text-right">Ganancia</TableHead>
                      <TableHead>Cobro</TableHead>
                      <TableHead>Vendedor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(lines.data ?? []).map((line) => (
                      <TableRow key={line.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {dateFormatter.format(new Date(line.createdAt))}
                        </TableCell>
                        <TableCell className="font-medium">{line.productName}</TableCell>
                        <TableCell className="text-right tabular-nums">{line.quantity}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoney(line.revenue)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {formatMoney(line.cost)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-medium tabular-nums",
                            line.profit < 0 ? "text-destructive" : "text-success",
                          )}
                        >
                          {formatMoney(line.profit)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {describePaymentMethods(line.paymentMethods ?? [])}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {describeMovementActor(line) ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </FinanceLayout>
  );
}
