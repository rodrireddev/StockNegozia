import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { TrendingUp } from "lucide-react-native";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Select } from "@/components/Select";
import { useAuthErrorRedirect } from "@/auth/useAuthErrorRedirect";
import { useProducts } from "@/features/products/hooks/useProducts";
import { useTheme } from "@/theme/useTheme";
import { minTouchTarget, radius, spacing, typography } from "@/theme/tokens";
import { DayProfitView } from "../components/DayProfitView";
import { ProfitChart } from "../components/ProfitChart";
import { ProfitLedgerListItem } from "../components/ProfitLedgerListItem";
import { ProfitTotalsCard } from "../components/ProfitTotalsCard";
import { sumBuckets, sumLedgerEntries } from "../data/ledger";
import { useDailyProfits } from "../hooks/useDailyProfits";
import { useProfitLedger } from "../hooks/useProfitLedger";

type ViewMode = "list" | "chart";
type ChartMode = "weekly" | "daily";

const TABS = [
  { value: "list" as const, label: "Historial" },
  { value: "chart" as const, label: "Gráfico" },
];

const CHART_MODES = [
  { value: "weekly" as const, label: "Semanal" },
  { value: "daily" as const, label: "Diario" },
];

function todayBounds(): { from: Date; to: Date } {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

/**
 * Historial de ganancias (ventas + ajustes de caja combinados, ver `features/profits/data/
 * ledger.ts`) más gráficos de ganancia — semanal (día vs. ganancia, últimos 7 días) y diario (hora
 * vs. ganancia, hoy). La ganancia de cada venta sale de `unitPrice`/`unitCost` ya congelados por
 * el backend al momento de la venta — nunca de los precios ACTUALES del producto. Un ajuste de
 * caja no toca ningún producto: sólo resta/suma directamente sobre la "Ganancia" final, nunca
 * sobre "Vendido"/"Costo". La administración de ajustes de caja (alta + su propio historial) vive
 * en su propia pantalla desde el menú principal (`features/cash-adjustments`), no acá.
 */
export function ProfitsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("list");
  const [chartMode, setChartMode] = useState<ChartMode>("weekly");
  const [productId, setProductId] = useState("");

  const productsQuery = useProducts({ status: "all", stockStatus: "all" });
  const productOptions = useMemo(
    () => [
      { value: "", label: "Todos los productos" },
      ...(productsQuery.data ?? []).map((product) => ({ value: String(product.id), label: product.name })),
    ],
    [productsQuery.data],
  );

  const ledgerQuery = useProfitLedger({ productId: productId ? Number(productId) : undefined });
  const dailyQuery = useDailyProfits(7);
  const today = useMemo(() => todayBounds(), []);
  useAuthErrorRedirect(productsQuery.error);
  useAuthErrorRedirect(ledgerQuery.error);
  useAuthErrorRedirect(dailyQuery.error);

  const listTotals = useMemo(() => sumLedgerEntries(ledgerQuery.data ?? []), [ledgerQuery.data]);
  const weekTotals = useMemo(() => sumBuckets(dailyQuery.data ?? []), [dailyQuery.data]);

  return (
    <ScreenContainer>
      <Text style={[typography.title, { color: colors.foreground, marginBottom: spacing.md }]}>
        Ganancias
      </Text>

      <View style={styles.viewToggle}>
        {TABS.map((tab) => {
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
                numberOfLines={1}
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

          {ledgerQuery.isPending ? (
            <LoadingState message="Cargando ganancias…" />
          ) : ledgerQuery.isError ? (
            <ErrorState message="No se pudo cargar el historial." onRetry={ledgerQuery.refetch} />
          ) : ledgerQuery.data.length === 0 ? (
            <EmptyState
              title={productId ? "Sin ganancias" : "Todavía no hay ganancias"}
              message={
                productId
                  ? "Este producto no tiene ventas registradas."
                  : "Las ventas y ajustes de caja van a aparecer acá."
              }
              icon={TrendingUp}
            />
          ) : (
            <FlatList
              data={ledgerQuery.data}
              keyExtractor={(item) => `${item.kind}-${item.id}`}
              contentContainerStyle={styles.listContent}
              ListHeaderComponent={<ProfitTotalsCard {...listTotals} />}
              ListHeaderComponentStyle={styles.listHeader}
              renderItem={({ item }) => <ProfitLedgerListItem entry={item} />}
              refreshing={ledgerQuery.isRefetching}
              onRefresh={ledgerQuery.refetch}
            />
          )}
        </>
      ) : (
        <>
          <View style={styles.filters}>
            {CHART_MODES.map((mode) => {
              const isActive = chartMode === mode.value;
              return (
                <Pressable
                  key={mode.value}
                  onPress={() => setChartMode(mode.value)}
                  style={[styles.chartModeTab, { backgroundColor: isActive ? colors.primary : colors.secondary }]}
                >
                  <Text
                    style={[
                      typography.label,
                      { color: isActive ? colors.primaryForeground : colors.secondaryForeground },
                    ]}
                  >
                    {mode.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {chartMode === "weekly" ? (
            dailyQuery.isPending ? (
              <LoadingState message="Cargando gráfico…" />
            ) : dailyQuery.isError ? (
              <ErrorState message="No se pudo cargar el gráfico." onRetry={dailyQuery.refetch} />
            ) : (
              <View style={styles.chartContent}>
                <ProfitTotalsCard {...weekTotals} />
                <Card>
                  <Text
                    style={[typography.label, { color: colors.mutedForeground, marginBottom: spacing.lg }]}
                  >
                    Últimos 7 días · tocá un día para ver el detalle
                  </Text>
                  <ProfitChart
                    data={dailyQuery.data}
                    onSelectDay={(date) => router.push({ pathname: "/profits/day", params: { date } })}
                  />
                </Card>
              </View>
            )
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <DayProfitView from={today.from} to={today.to} />
            </ScrollView>
          )}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  viewToggle: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  tab: {
    flex: 1,
    minHeight: minTouchTarget,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  chartModeTab: {
    flex: 1,
    minHeight: minTouchTarget,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  filters: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  listContent: { gap: spacing.sm, paddingBottom: spacing.xxl },
  listHeader: { marginBottom: spacing.sm },
  chartContent: { gap: spacing.md },
});
