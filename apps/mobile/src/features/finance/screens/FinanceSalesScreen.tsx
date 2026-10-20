import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { TrendingUp } from "lucide-react-native";
import { describePaymentMethods, formatMoney } from "@stocknegozia/shared";
import { Card } from "@/components/Card";
import { ExportCsvButton } from "@/components/ExportCsvButton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
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
                {(lines.data ?? []).slice(0, visible).map((line) => (
                  <ListRow
                    key={line.id}
                    title={`${line.productName} × ${line.quantity}`}
                    subtitle={`${dateFormatter.format(new Date(line.createdAt))} · ${describePaymentMethods(line.paymentMethods ?? [])} · vendido ${formatMoney(line.revenue)}`}
                    amount={line.profit}
                    tone={line.profit < 0 ? "negative" : "positive"}
                  />
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
