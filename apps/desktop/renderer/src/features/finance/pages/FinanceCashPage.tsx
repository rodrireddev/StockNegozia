import { formatMoney, groupCashByReason } from "@stocknegozia/shared";
import { Plus, Wallet } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
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
  useCashAdjustmentsInRange,
  useFinancePeriod,
  useFinanceSummary,
} from "../hooks/useFinance";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" });

/**
 * "Lo que se retiró de la caja y por qué": retiros e ingresos por fuera de las ventas, agrupados
 * por motivo (sueldos, alquiler, aportes...). Separado de la ganancia por ventas a propósito. El
 * alta de movimientos sigue en "Ajustes de caja".
 */
export function FinanceCashPage() {
  const { period } = useFinancePeriod();
  const summary = useFinanceSummary(period);
  const adjustments = useCashAdjustmentsInRange(period);

  const groups = useMemo(
    () =>
      groupCashByReason(
        (adjustments.data ?? []).map((row) => ({ ...row, createdAt: new Date(row.createdAt) })),
      ),
    [adjustments.data],
  );
  const withdrawalGroups = groups.filter((group) => group.direction === "OUT");
  const depositGroups = groups.filter((group) => group.direction === "IN");
  const maxWithdrawal = withdrawalGroups[0]?.total ?? 0;

  return (
    <FinanceLayout>
      <div className="flex justify-end">
        <Button asChild variant="outline" size="sm">
          <Link to="/cash-adjustments">
            <Plus className="mr-1 h-4 w-4" /> Registrar retiro o ingreso
          </Link>
        </Button>
      </div>

      {summary.isLoading || adjustments.isLoading ? (
        <FinanceLoading />
      ) : summary.isError || adjustments.isError || !summary.data ? (
        <FinanceError
          onRetry={() => {
            void summary.refetch();
            void adjustments.refetch();
          }}
        />
      ) : groups.length === 0 ? (
        <FinanceEmpty
          icon={<Wallet className="h-10 w-10 text-muted-foreground" />}
          message="No hay retiros ni ingresos de caja en este período."
        />
      ) : (
        <>
          <StatsCard columns={3}>
            <Stat
              label="Retiros"
              value={summary.data.cash.withdrawals}
              tone="negative"
              hint={`${summary.data.cash.withdrawalsCount} movimientos`}
              large
            />
            <Stat
              label="Ingresos"
              value={summary.data.cash.deposits}
              tone="positive"
              hint={`${summary.data.cash.depositsCount} movimientos`}
              large
            />
            <Stat
              label="Neto de caja"
              value={summary.data.cash.deposits - summary.data.cash.withdrawals}
              tone={
                summary.data.cash.deposits >= summary.data.cash.withdrawals ? "default" : "negative"
              }
              large
            />
          </StatsCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Retiros por motivo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {withdrawalGroups.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin retiros en el período.</p>
                ) : (
                  withdrawalGroups.map((group) => (
                    <div key={group.reason} className="space-y-1">
                      <div className="flex justify-between gap-3 text-sm">
                        <span className="truncate">
                          {group.reason}{" "}
                          <span className="text-xs text-muted-foreground">×{group.count}</span>
                        </span>
                        <span className="shrink-0 font-medium tabular-nums text-destructive">
                          {formatMoney(group.total)}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-destructive"
                          style={{ width: `${(group.total / (maxWithdrawal || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
                {depositGroups.length > 0 && (
                  <div className="space-y-1 border-t border-border pt-3">
                    <p className="text-xs font-medium text-muted-foreground">Ingresos por motivo</p>
                    {depositGroups.map((group) => (
                      <div key={group.reason} className="flex justify-between gap-3 text-sm">
                        <span className="truncate">{group.reason}</span>
                        <span className="shrink-0 tabular-nums text-success">
                          {formatMoney(group.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">
                  Retiros · {summary.data.granularity === "hour" ? "por hora" : "por día"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FinanceChart data={summary.data.series} metric="withdrawals" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Movimientos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(adjustments.data ?? []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {dateFormatter.format(new Date(row.createdAt))}
                      </TableCell>
                      <TableCell>{row.direction === "OUT" ? "Retiro" : "Ingreso"}</TableCell>
                      <TableCell>{row.reason}</TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-medium tabular-nums",
                          row.direction === "OUT" ? "text-destructive" : "text-success",
                        )}
                      >
                        {row.direction === "OUT" ? "−" : "+"}
                        {formatMoney(row.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </FinanceLayout>
  );
}
