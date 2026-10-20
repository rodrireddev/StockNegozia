import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { TrendingUp } from "lucide-react-native";
import { describePaymentMethods, formatMoney } from "@stocknegozia/shared";
import { Card } from "@/components/Card";
import { ExportCsvButton } from "@/components/ExportCsvButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { useCancelSale } from "@/features/sales/hooks/useCancelSale";
import { useTheme } from "@/theme/useTheme";
import { radius, spacing, typography } from "@/theme/tokens";
import { FinanceChart } from "../components/FinanceChart";
import { BarList, ListRow, SectionCard, ShowMoreButton, ValueRow } from "../components/FinanceUi";
import {
  useFinancePeriod,
  useFinanceSummary,
  useSaleLines,
  useTopProducts,
} from "../hooks/useFinance";

const PAGE_SIZE = 15;
const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** "Lo que se ganó vendiendo": totales, gráfico, productos más rentables y detalle paginado. */
export function FinanceSalesScreen() {
  const { colors } = useTheme();
  const { period } = useFinancePeriod();
  const summary = useFinanceSummary(period);
  const top = useTopProducts(period, 5);
  const lines = useSaleLines(period);
  const [metric, setMetric] = useState<"profit" | "revenue">("profit");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [saleToCancel, setSaleToCancel] = useState<{ id: number; date: string } | null>(null);
  const cancelSale = useCancelSale();

  function confirmCancel() {
    if (!saleToCancel) return;
    cancelSale.mutate(saleToCancel.id, {
      onSettled: () => setSaleToCancel(null),
      onError: (error) =>
        Alert.alert("No se pudo anular la venta", error instanceof Error ? error.message : ""),
    });
  }

  return (
    <>
      <Stack.Screen options={{ title: `Ventas · ${period.label}` }} />
      {summary.isPending ? (
        <LoadingState />
      ) : summary.isError ? (
        <ErrorState message="No se pudieron cargar las ventas." onRetry={summary.refetch} />
      ) : summary.data.sales.count === 0 ? (
        <EmptyState title="Sin ventas" message="No hay ventas en este período." icon={TrendingUp} />
      ) : (
        <ScrollView
          style={{ backgroundColor: colors.background }}
          contentContainerStyle={styles.content}
        >
          <Card style={styles.card}>
            <ValueRow label="Vendido" value={summary.data.sales.revenue} />
            <ValueRow label="Costo de lo vendido" value={summary.data.sales.cost} />
            <ValueRow
              label="Ganancia"
              hint={`Margen ${summary.data.sales.marginPercent}%`}
              value={summary.data.sales.profit}
              tone={summary.data.sales.profit < 0 ? "negative" : "positive"}
              strong
            />
            <Text style={[typography.caption, { color: colors.mutedForeground }]}>
              {summary.data.sales.count} ventas · {summary.data.sales.unitsSold} unidades · ticket
              promedio {formatMoney(summary.data.sales.averageTicket)}
            </Text>
          </Card>

          <SectionCard
            title={summary.data.granularity === "hour" ? "Por hora" : "Por día"}
            action={
              <View style={[styles.toggle, { borderColor: colors.border }]}>
                {(["profit", "revenue"] as const).map((option) => {
                  const active = metric === option;
                  return (
                    <Pressable
                      key={option}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => setMetric(option)}
                      style={[styles.toggleOption, active && { backgroundColor: colors.secondary }]}
                    >
                      <Text
                        style={[
                          typography.caption,
                          { color: active ? colors.foreground : colors.mutedForeground },
                        ]}
                      >
                        {option === "profit" ? "Ganancia" : "Vendido"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            }
          >
            <FinanceChart data={summary.data.series} metric={metric} />
          </SectionCard>

          {top.data && top.data.length > 0 ? (
            <SectionCard title="Productos más rentables">
              <BarList
                barColor={colors.success}
                items={top.data.map((product) => ({
                  key: String(product.productId),
                  label: product.productName,
                  sublabel: `${product.quantity} un. · vendido ${formatMoney(product.revenue)}`,
                  amount: product.profit,
                }))}
              />
            </SectionCard>
          ) : null}

          <SectionCard title="Detalle de ventas">
            <ExportCsvButton
              fileName="ventas"
              rows={lines.data}
              columns={[
                { header: "Fecha", value: (l) => dateFormatter.format(new Date(l.createdAt)) },
                { header: "Venta N°", value: (l) => l.saleId },
                { header: "Producto", value: (l) => l.productName },
                { header: "Cantidad", value: (l) => l.quantity },
                { header: "Precio unitario", value: (l) => l.unitPrice },
                { header: "Vendido", value: (l) => l.revenue },
                { header: "Costo", value: (l) => l.cost },
                { header: "Ganancia", value: (l) => l.profit },
                { header: "Cobro", value: (l) => describePaymentMethods(l.paymentMethods ?? []) },
              ]}
            />
            {lines.isPending ? (
              <LoadingState />
            ) : (
              <>
                <Text style={[typography.caption, { color: colors.mutedForeground }]}>
                  Tocá una línea para anular su venta.
                </Text>
                {(lines.data ?? []).slice(0, visible).map((line) => (
                  <Pressable
                    key={line.id}
                    accessibilityRole="button"
                    accessibilityHint="Anular la venta"
                    onPress={() =>
                      setSaleToCancel({
                        id: line.saleId,
                        date: dateFormatter.format(new Date(line.createdAt)),
                      })
                    }
                  >
                    <ListRow
                      title={`${line.productName} × ${line.quantity}`}
                      subtitle={`${dateFormatter.format(new Date(line.createdAt))} · ${describePaymentMethods(line.paymentMethods ?? [])} · vendido ${formatMoney(line.revenue)}`}
                      amount={line.profit}
                      tone={line.profit < 0 ? "negative" : "positive"}
                    />
                  </Pressable>
                ))}
                <ShowMoreButton
                  remaining={(lines.data?.length ?? 0) - visible}
                  onPress={() => setVisible((current) => current + PAGE_SIZE)}
                />
              </>
            )}
          </SectionCard>
        </ScrollView>
      )}
      <ConfirmDialog
        open={saleToCancel !== null}
        onOpenChange={(open) => !open && setSaleToCancel(null)}
        title={`¿Anular la venta #${saleToCancel?.id ?? ""}?`}
        description={`Venta del ${saleToCancel?.date ?? ""}. Se anula completa (todos sus productos), el stock vuelve al inventario y deja de contar en Ganancias. No se puede deshacer.`}
        confirmLabel="Anular venta"
        variant="danger"
        onConfirm={confirmCancel}
        isPending={cancelSale.isPending}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xxl },
  card: { gap: spacing.sm },
  toggle: {
    flexDirection: "row",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: 2,
  },
  toggleOption: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
});
