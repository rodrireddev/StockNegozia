import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { TrendingUp } from "lucide-react-native";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Select } from "@/components/Select";
import { useProducts } from "@/features/products/hooks/useProducts";
import { useTheme } from "@/theme/useTheme";
import { minTouchTarget, radius, spacing, typography } from "@/theme/tokens";
import { ProfitCard } from "../components/ProfitCard";
import { ProfitChart } from "../components/ProfitChart";
import { useDailyProfits } from "../hooks/useDailyProfits";
import { useProfits } from "../hooks/useProfits";
import type { ProfitEntryDto } from "../data/service";

const currencyFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

type ViewMode = "list" | "chart";

function sumEntries(entries: { revenue: number; cost: number; profit: number }[]) {
  return entries.reduce(
    (acc, entry) => ({
      revenue: acc.revenue + entry.revenue,
      cost: acc.cost + entry.cost,
      profit: acc.profit + entry.profit,
    }),
    { revenue: 0, cost: 0, profit: 0 },
  );
}

function TotalsCard({ revenue, cost, profit }: { revenue: number; cost: number; profit: number }) {
  const { colors } = useTheme();
  return (
    <Card style={styles.totalsCard}>
      <View style={styles.totalsRow}>
        <Text style={[typography.caption, { color: colors.mutedForeground }]}>Vendido</Text>
        <Text style={[typography.caption, { color: colors.mutedForeground }]}>Costo</Text>
        <Text style={[typography.label, { color: colors.mutedForeground }]}>Ganancia</Text>
      </View>
      <View style={styles.totalsRow}>
        <Text style={[typography.bodyStrong, { color: colors.foreground }]}>
          {currencyFormatter.format(revenue)}
        </Text>
        <Text style={[typography.bodyStrong, { color: colors.foreground }]}>
          {currencyFormatter.format(cost)}
        </Text>
        <Text
          style={[typography.bodyStrong, { color: profit < 0 ? colors.danger : colors.success }]}
        >
          {currencyFormatter.format(profit)}
        </Text>
      </View>
    </Card>
  );
}

/**
 * Historial de ganancias por venta (similar a "Movimientos" de Inventario, ver
 * `features/inventory/screens/MovementsScreen.tsx`) más un gráfico semanal día vs. ganancia. La
 * ganancia de cada línea sale de `sale_items.unitPrice - sale_items.unitCost` (ambos congelados al
 * momento de la venta, ver `database/schema/sales.ts`) — nunca de los precios ACTUALES del
 * producto, o una venta vieja cambiaría de resultado cada vez que se actualiza un precio.
 */
export function ProfitsScreen() {
  const { colors } = useTheme();
  const [view, setView] = useState<ViewMode>("list");
  const [productId, setProductId] = useState("");

  const productsQuery = useProducts({ status: "all", stockStatus: "all" });
  const productOptions = useMemo(
    () => [
      { value: "", label: "Todos los productos" },
      ...(productsQuery.data ?? []).map((product) => ({ value: String(product.id), label: product.name })),
    ],
    [productsQuery.data],
  );

  const profitsQuery = useProfits({ productId: productId ? Number(productId) : undefined });
  const dailyQuery = useDailyProfits(7);

  const listTotals = useMemo(() => sumEntries(profitsQuery.data ?? []), [profitsQuery.data]);
  const weekTotals = useMemo(() => sumEntries(dailyQuery.data ?? []), [dailyQuery.data]);

  return (
    <ScreenContainer>
      <Text style={[typography.title, { color: colors.foreground, marginBottom: spacing.md }]}>
        Ganancias
      </Text>

      <View style={styles.viewToggle}>
        {(
          [
            { value: "list", label: "Historial" },
            { value: "chart", label: "Gráfico semanal" },
          ] as const
        ).map((tab) => {
          const isActive = view === tab.value;
          return (
            <Pressable
              key={tab.value}
              onPress={() => setView(tab.value)}
              style={[styles.tab, { backgroundColor: isActive ? colors.primary : colors.secondary }]}
            >
              <Text
                style={[
                  typography.label,
                  { color: isActive ? colors.primaryForeground : colors.secondaryForeground },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {view === "list" ? (
        <>
          <View style={styles.filters}>
            <Select
              label="Producto"
              value={productId}
              placeholder="Todos los productos"
              options={productOptions}
              onChange={setProductId}
            />
          </View>

          {profitsQuery.isPending ? (
            <LoadingState message="Cargando ganancias…" />
          ) : profitsQuery.isError ? (
            <ErrorState message="No se pudo cargar el historial." onRetry={profitsQuery.refetch} />
          ) : profitsQuery.data.length === 0 ? (
            <EmptyState
              title={productId ? "Sin ganancias" : "Todavía no hay ganancias"}
              message={
                productId
                  ? "Este producto no tiene ventas registradas."
                  : "Las ganancias de cada venta van a aparecer acá."
              }
              icon={TrendingUp}
            />
          ) : (
            <FlatList
              data={profitsQuery.data}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.listContent}
              ListHeaderComponent={<TotalsCard {...listTotals} />}
              ListHeaderComponentStyle={styles.listHeader}
              renderItem={({ item }: { item: ProfitEntryDto }) => <ProfitCard entry={item} />}
              refreshing={profitsQuery.isRefetching}
              onRefresh={profitsQuery.refetch}
            />
          )}
        </>
      ) : dailyQuery.isPending ? (
        <LoadingState message="Cargando gráfico…" />
      ) : dailyQuery.isError ? (
        <ErrorState message="No se pudo cargar el gráfico." onRetry={dailyQuery.refetch} />
      ) : (
        <View style={styles.chartContent}>
          <TotalsCard {...weekTotals} />
          <Card>
            <Text style={[typography.label, { color: colors.mutedForeground, marginBottom: spacing.lg }]}>
              Últimos 7 días
            </Text>
            <ProfitChart data={dailyQuery.data} />
          </Card>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  viewToggle: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  tab: {
    minHeight: minTouchTarget,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  filters: { gap: spacing.md, marginBottom: spacing.md },
  listContent: { gap: spacing.sm, paddingBottom: spacing.xxl },
  listHeader: { marginBottom: spacing.sm },
  chartContent: { gap: spacing.md },
  totalsCard: { gap: spacing.sm },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
});
