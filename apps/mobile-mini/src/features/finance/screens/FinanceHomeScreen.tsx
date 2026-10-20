import { ScrollView, StyleSheet, Text } from "react-native";
import { useRouter, type Href } from "expo-router";
import { CreditCard, PackagePlus, TrendingUp, Wallet } from "lucide-react-native";
import { formatMoney } from "@stocknegozia/shared";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { ScreenContainer } from "@/components/ScreenContainer";
import { useTheme } from "@/theme/useTheme";
import { spacing, typography } from "@/theme/tokens";
import { NavCard, PeriodChips } from "../components/FinanceUi";
import { useFinancePeriod, useFinanceSummary } from "../hooks/useFinance";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" });

/**
 * Ganancias (hub): sólo el período y cuatro tarjetas SEPARADAS — lo que se ganó vendiendo, lo que
 * se gastó en mercadería, lo que se retiró de la caja y cómo se cobró. Cada tarjeta abre su
 * propia pantalla con el detalle; acá no hay listas ni gráficos para que no se sobrecargue.
 * Mismo componente en `apps/mobile`.
 */
export function FinanceHomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { period, setPreset } = useFinancePeriod();
  const summary = useFinanceSummary(period);
  const go = (path: string) =>
    router.push({ pathname: path, params: { period: period.preset } } as unknown as Href);

  return (
    <ScreenContainer>
      <Text style={[typography.title, { color: colors.foreground }]}>Ganancias</Text>
      <Text style={[typography.caption, styles.subtitle, { color: colors.mutedForeground }]}>
        {period.label}
      </Text>
      <PeriodChips value={period.preset} onChange={setPreset} />

      {summary.isPending ? (
        <LoadingState message="Cargando resumen…" />
      ) : summary.isError ? (
        <ErrorState message="No se pudo cargar el resumen." onRetry={summary.refetch} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <NavCard
            testID="finance-sales"
            title="Ganancia por ventas"
            icon={TrendingUp}
            value={summary.data.sales.profit}
            tone={summary.data.sales.profit < 0 ? "negative" : "positive"}
            subtitle={`Vendido ${formatMoney(summary.data.sales.revenue)} · margen ${summary.data.sales.marginPercent}% · ${summary.data.sales.count} ${summary.data.sales.count === 1 ? "venta" : "ventas"}`}
            onPress={() => go("/profits/sales")}
          />
          <NavCard
            testID="finance-purchases"
            title="Gastos en mercadería"
            icon={PackagePlus}
            value={summary.data.purchases.total}
            subtitle={`${summary.data.purchases.count} ${summary.data.purchases.count === 1 ? "compra" : "compras"} a proveedores`}
            onPress={() => go("/profits/purchases")}
          />
          <NavCard
            testID="finance-cash"
            title="Retiros de caja"
            icon={Wallet}
            value={summary.data.cash.withdrawals}
            tone={summary.data.cash.withdrawals > 0 ? "negative" : "default"}
            subtitle={`${summary.data.cash.withdrawalsCount} ${summary.data.cash.withdrawalsCount === 1 ? "retiro" : "retiros"}${summary.data.cash.deposits > 0 ? ` · ingresos ${formatMoney(summary.data.cash.deposits)}` : ""}`}
            onPress={() => go("/profits/cash")}
          />
          <NavCard
            testID="finance-collections"
            title="Cobrado"
            icon={CreditCard}
            value={summary.data.collections.total}
            subtitle={`${
              summary.data.pendingSettlement.count > 0
                ? `Por acreditar ${formatMoney(summary.data.pendingSettlement.amount)}${
                    summary.data.pendingSettlement.nextDate
                      ? ` · próxima ${dateFormatter.format(new Date(summary.data.pendingSettlement.nextDate))}`
                      : ""
                  }`
                : "Nada pendiente de acreditar"
            }${
              summary.data.receivables.outstanding > 0
                ? ` · fiado a cobrar ${formatMoney(summary.data.receivables.outstanding)}`
                : ""
            }`}
            onPress={() => go("/profits/collections")}
          />
          <Text style={[typography.caption, { color: colors.mutedForeground }]}>
            La ganancia por ventas es lo vendido menos el costo de lo vendido. Las compras y los
            retiros de caja se muestran aparte.
          </Text>
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  subtitle: { marginBottom: spacing.sm },
  content: { gap: spacing.md, paddingBottom: spacing.xxl },
});
