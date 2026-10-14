import { formatMoney } from "@stocknegozia/shared";
import { PackagePlus } from "lucide-react";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FinanceChart } from "../components/FinanceChart";
import {
  FinanceEmpty,
  FinanceError,
  FinanceLayout,
  FinanceLoading,
} from "../components/FinanceLayout";
import { Stat, StatsCard } from "../components/Stat";
import { useFinancePeriod, useFinanceSummary, usePurchasesInRange } from "../hooks/useFinance";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" });

/** "Lo que se gastó en productos": compras a proveedores del período, por proveedor y detalle. */
export function FinancePurchasesPage() {
  const { period } = useFinancePeriod();
  const summary = useFinanceSummary(period);
  const purchases = usePurchasesInRange(period);

  const bySupplier = useMemo(() => {
    const groups = new Map<string, { name: string; total: number; count: number }>();
    for (const purchase of purchases.data ?? []) {
      const group = groups.get(purchase.supplierName) ?? {
        name: purchase.supplierName,
        total: 0,
        count: 0,
      };
      group.total = Math.round((group.total + purchase.total) * 100) / 100;
      group.count += 1;
      groups.set(purchase.supplierName, group);
    }
    return [...groups.values()].sort((a, b) => b.total - a.total);
  }, [purchases.data]);
  const maxSupplierTotal = bySupplier[0]?.total ?? 0;

  return (
    <FinanceLayout>
      {summary.isLoading || purchases.isLoading ? (
        <FinanceLoading />
      ) : summary.isError || purchases.isError || !summary.data ? (
        <FinanceError
          onRetry={() => {
            void summary.refetch();
            void purchases.refetch();
          }}
        />
      ) : summary.data.purchases.count === 0 ? (
        <FinanceEmpty
          icon={<PackagePlus className="h-10 w-10 text-muted-foreground" />}
          message="No hay compras de mercadería en este período."
        />
      ) : (
        <>
          <StatsCard columns={3}>
            <Stat label="Gastado en mercadería" value={summary.data.purchases.total} large />
            <Stat
              label="Promedio por compra"
              value={summary.data.purchases.total / summary.data.purchases.count}
              hint={`${summary.data.purchases.count} compras`}
              large
            />
            <Stat
              label="Costo de lo vendido (mismo período)"
              value={summary.data.sales.cost}
              hint="Lo que salió del stock vendiendo"
              large
            />
          </StatsCard>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                Compras · {summary.data.granularity === "hour" ? "por hora" : "por día"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FinanceChart data={summary.data.series} metric="purchases" />
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Por proveedor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {bySupplier.map((supplier) => (
                  <div key={supplier.name} className="space-y-1">
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="truncate">{supplier.name}</span>
                      <span className="shrink-0 font-medium tabular-nums">
                        {formatMoney(supplier.total)}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-warning"
                        style={{ width: `${(supplier.total / (maxSupplierTotal || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Detalle de compras</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(purchases.data ?? []).map((purchase) => (
                      <TableRow key={purchase.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {dateFormatter.format(new Date(purchase.createdAt))}
                        </TableCell>
                        <TableCell className="font-medium">{purchase.supplierName}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoney(purchase.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </FinanceLayout>
  );
}
