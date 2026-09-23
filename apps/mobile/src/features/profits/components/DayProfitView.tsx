import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { TrendingUp } from "lucide-react-native";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { Card } from "@/components/Card";
import { useAuthErrorRedirect } from "@/auth/useAuthErrorRedirect";
import { useTheme } from "@/theme/useTheme";
import { spacing, typography } from "@/theme/tokens";
import { useProfitLedger } from "../hooks/useProfitLedger";
import { useHourlyProfits } from "../hooks/useHourlyProfits";
import { sumLedgerEntries } from "../data/ledger";
import { ProfitChart } from "./ProfitChart";
import { ProfitLedgerListItem } from "./ProfitLedgerListItem";
import { ProfitTotalsCard } from "./ProfitTotalsCard";

interface DayProfitViewProps {
  /** `YYYY-MM-DD`, o `undefined` para el día de hoy. */
  date?: string;
  from: Date;
  to: Date;
}

/**
 * Ganancia de UN día puntual: gráfico por hora (lo calcula el backend, ver `GET /profits/hourly`)
 * + el mismo historial combinado (ventas + ajustes de caja) acotado a ese día. Reusada por el
 * modo "Diario" de `ProfitsScreen` (hoy, inline) y por `ProfitDayDetailScreen` (un día pasado, al
 * tocar una barra del gráfico semanal) — un único lugar para no mantener esta vista dos veces.
 */
export function DayProfitView({ date, from, to }: DayProfitViewProps) {
  const { colors } = useTheme();
  const ledgerQuery = useProfitLedger({ from, to });
  const hourlyQuery = useHourlyProfits(date);
  useAuthErrorRedirect(ledgerQuery.error);
  useAuthErrorRedirect(hourlyQuery.error);

  const totals = useMemo(() => sumLedgerEntries(ledgerQuery.data ?? []), [ledgerQuery.data]);

  if (ledgerQuery.isPending || hourlyQuery.isPending) return <LoadingState message="Cargando…" />;
  if (ledgerQuery.isError) {
    return <ErrorState message="No se pudo cargar el detalle del día." onRetry={ledgerQuery.refetch} />;
  }
  if (hourlyQuery.isError) {
    return <ErrorState message="No se pudo cargar el gráfico." onRetry={hourlyQuery.refetch} />;
  }

  return (
    <View style={styles.container}>
      <ProfitTotalsCard {...totals} />

      <Card>
        <Text style={[typography.label, { color: colors.mutedForeground, marginBottom: spacing.lg }]}>
          Por hora
        </Text>
        <ProfitChart data={hourlyQuery.data.map((hour) => ({ date: String(hour.hour), ...hour }))} />
      </Card>

      {ledgerQuery.data.length === 0 ? (
        <EmptyState
          title="Sin movimientos"
          message="Ese día no hay ventas ni ajustes de caja registrados."
          icon={TrendingUp}
        />
      ) : (
        // `.map()` en vez de `FlatList` a propósito: esta vista ya vive dentro de un `ScrollView`
        // (ver `ProfitsScreen`/`ProfitDayDetailScreen`), y React Native no soporta anidar una
        // lista virtualizada dentro de un scroll — la cantidad de líneas de un solo día es chica,
        // no hace falta virtualización acá.
        <View style={styles.listContent}>
          {ledgerQuery.data.map((item) => (
            <ProfitLedgerListItem key={`${item.kind}-${item.id}`} entry={item} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  listContent: { gap: spacing.sm, paddingBottom: spacing.xxl },
});
