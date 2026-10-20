import { formatMoney } from "@stocknegozia/shared";
import { Banknote, CreditCard, PackagePlus, TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FinanceChart } from "../components/FinanceChart";
import { FinanceError, FinanceLayout, FinanceLoading } from "../components/FinanceLayout";
import { KpiLinkCard } from "../components/Stat";
import { useFinancePeriod, useFinanceSummary } from "../hooks/useFinance";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" });

/**
 * Resumen del período: cuatro tarjetas SEPARADAS — lo que se ganó vendiendo, lo que se gastó en
 * mercadería, lo que se retiró de la caja y cómo se cobró — cada una lleva a su vista. Antes los
 * retiros se restaban de la ganancia y un día con un retiro grande parecía un mal día de ventas.
 */
export function FinanceOverviewPage() {
  const { period, search } = useFinancePeriod();
  const summary = useFinanceSummary(period);

  return (
    <FinanceLayout>
      {summary.isLoading ? (
        <FinanceLoading label="Cargando resumen…" />
      ) : summary.isError || !summary.data ? (
        <FinanceError onRetry={() => void summary.refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <KpiLinkCard
              to={`/profits/sales${search}`}
              title="Ganancia por ventas"
              icon={<TrendingUp className="h-4 w-4" />}
            >
              <p
                className={cn(
                  "break-words text-2xl font-semibold tabular-nums",
                  summary.data.sales.profit < 0 ? "text-destructive" : "text-success",
                )}
              >
                {formatMoney(summary.data.sales.profit)}
              </p>
              <p className="text-xs text-muted-foreground">
                Vendido {formatMoney(summary.data.sales.revenue)} · margen{" "}
                {summary.data.sales.marginPercent}% · {summary.data.sales.count}{" "}
                {summary.data.sales.count === 1 ? "venta" : "ventas"}
              </p>
            </KpiLinkCard>

            <KpiLinkCard
              to={`/profits/purchases${search}`}
              title="Gastos en mercadería"
              icon={<PackagePlus className="h-4 w-4" />}
            >
              <p className="break-words text-2xl font-semibold tabular-nums">
                {formatMoney(summary.data.purchases.total)}
              </p>
              <p className="text-xs text-muted-foreground">
                {summary.data.purchases.count}{" "}
                {summary.data.purchases.count === 1 ? "compra" : "compras"} a proveedores
              </p>
            </KpiLinkCard>

            <KpiLinkCard
              to={`/profits/cash${search}`}
              title="Retiros de caja"
              icon={<Wallet className="h-4 w-4" />}
            >
              <p className="break-words text-2xl font-semibold tabular-nums text-destructive">
                {formatMoney(summary.data.cash.withdrawals)}
              </p>
              <p className="text-xs text-muted-foreground">
                {summary.data.cash.withdrawalsCount}{" "}
                {summary.data.cash.withdrawalsCount === 1 ? "retiro" : "retiros"}
                {summary.data.cash.deposits > 0 &&
                  ` · ingresos ${formatMoney(summary.data.cash.deposits)}`}
              </p>
            </KpiLinkCard>

            <KpiLinkCard
              to={`/profits/collections${search}`}
              title="Cobrado"
              icon={<CreditCard className="h-4 w-4" />}
            >
              <p className="break-words text-2xl font-semibold tabular-nums">
                {formatMoney(summary.data.collections.total)}
              </p>
              <p className="text-xs text-muted-foreground">
                {summary.data.pendingSettlement.count > 0
                  ? `Por acreditar ${formatMoney(summary.data.pendingSettlement.amount)}${
                      summary.data.pendingSettlement.nextDate
                        ? ` · próxima ${dateFormatter.format(new Date(summary.data.pendingSettlement.nextDate))}`
                        : ""
                    }`
                  : "Nada pendiente de acreditar"}
              </p>
              {summary.data.receivables.outstanding > 0 && (
                <p className="text-xs text-warning">
                  Fiado a cobrar {formatMoney(summary.data.receivables.outstanding)}
                </p>
              )}
            </KpiLinkCard>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                Ganancia por ventas · {summary.data.granularity === "hour" ? "por hora" : "por día"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FinanceChart data={summary.data.series} metric="profit" />
            </CardContent>
          </Card>

          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Banknote className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            La ganancia por ventas es vendido menos el costo de lo vendido. Las compras no se restan
            (su costo ya está en lo vendido) y los retiros de caja se muestran aparte.
          </p>
        </>
      )}
    </FinanceLayout>
  );
}
