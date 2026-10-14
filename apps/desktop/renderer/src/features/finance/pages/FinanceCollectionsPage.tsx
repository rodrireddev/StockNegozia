import type { SettlementDto } from "@stocknegozia/api-contracts";
import { CARD_BRAND_LABELS, formatMoney, PAYMENT_METHOD_SHORT_LABELS } from "@stocknegozia/shared";
import { CalendarClock, Settings } from "lucide-react";
import { useState } from "react";
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
import { FinanceError, FinanceLayout, FinanceLoading } from "../components/FinanceLayout";
import { PaymentMethodsCard } from "../components/PaymentMethodsCard";
import { Stat, StatsCard } from "../components/Stat";
import {
  useFinancePeriod,
  useFinanceSummary,
  usePendingSettlements,
  useSettledInRange,
} from "../hooks/useFinance";

const dayFormatter = new Intl.DateTimeFormat("es-AR", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

function describeSettlement(item: SettlementDto): string {
  const parts = [PAYMENT_METHOD_SHORT_LABELS[item.method]];
  if (item.cardBrand) parts[0] = `${parts[0]} ${CARD_BRAND_LABELS[item.cardBrand]}`;
  if (item.installments && item.installments > 1) parts.push(`${item.installments} cuotas`);
  return parts.join(" · ");
}

/**
 * "Cómo entró la plata": cobrado por medio de pago, recargos cobrados al cliente, comisiones del
 * procesador y lo que todavía no se acreditó (tarjetas/QR tardan días en llegar a la cuenta).
 */
export function FinanceCollectionsPage() {
  const { period } = useFinancePeriod();
  const summary = useFinanceSummary(period);
  const pending = usePendingSettlements();
  const settled = useSettledInRange(period);
  const [tab, setTab] = useState<"pending" | "settled">("pending");
  const list = tab === "pending" ? pending : settled;

  return (
    <FinanceLayout>
      <div className="flex justify-end">
        <Button asChild variant="outline" size="sm">
          <Link to="/settings">
            <Settings className="mr-1 h-4 w-4" /> Recargos, comisiones y plazos
          </Link>
        </Button>
      </div>

      {summary.isLoading ? (
        <FinanceLoading />
      ) : summary.isError || !summary.data ? (
        <FinanceError onRetry={() => void summary.refetch()} />
      ) : (
        <>
          <StatsCard columns={4}>
            <Stat
              label="Cobrado"
              value={summary.data.collections.total}
              hint="Ventas + recargos"
              large
            />
            <Stat
              label="Recargos cobrados"
              value={summary.data.collections.surcharges}
              tone="positive"
              large
            />
            <Stat
              label="Comisiones"
              value={-summary.data.collections.fees}
              tone={summary.data.collections.fees > 0 ? "negative" : "default"}
              hint="Estimadas según tus condiciones"
              large
            />
            <Stat
              label="Por acreditar (hoy)"
              value={summary.data.pendingSettlement.amount}
              tone="warning"
              hint={`${summary.data.pendingSettlement.count} cobros pendientes`}
              large
            />
          </StatsCard>

          <div className="grid gap-4 xl:grid-cols-2">
            <PaymentMethodsCard data={summary.data.collections.byMethod} />

            <Card>
              <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
                <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarClock className="h-4 w-4" /> Acreditaciones
                </CardTitle>
                <div className="flex gap-1 rounded-md border border-border p-0.5">
                  <Button
                    size="sm"
                    className="h-7"
                    variant={tab === "pending" ? "secondary" : "ghost"}
                    onClick={() => setTab("pending")}
                  >
                    Pendientes
                  </Button>
                  <Button
                    size="sm"
                    className="h-7"
                    variant={tab === "settled" ? "secondary" : "ghost"}
                    onClick={() => setTab("settled")}
                  >
                    Acreditadas
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {list.isLoading ? (
                  <FinanceLoading />
                ) : (list.data ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {tab === "pending"
                      ? "No hay cobros pendientes de acreditar."
                      : "Nada acreditado en este período."}
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Se acredita</TableHead>
                        <TableHead>Medio</TableHead>
                        <TableHead>Venta</TableHead>
                        <TableHead className="text-right">Neto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(list.data ?? []).map((item) => (
                        <TableRow key={item.paymentId}>
                          <TableCell className="whitespace-nowrap">
                            {dayFormatter.format(new Date(item.settlementDate))}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {describeSettlement(item)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">#{item.saleId}</TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {formatMoney(item.netAmount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </FinanceLayout>
  );
}
