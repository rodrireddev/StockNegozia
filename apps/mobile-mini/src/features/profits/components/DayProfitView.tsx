import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { TrendingUp } from "lucide-react-native";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { Card } from "@/components/Card";
import { useTheme } from "@/theme/useTheme";
import { spacing, typography } from "@/theme/tokens";
import { useProfitLedger } from "../hooks/useProfitLedger";
import { bucketEntriesByHour, sumLedgerEntries } from "../data/ledger";
import { ProfitChart } from "./ProfitChart";
import { ProfitLedgerListItem } from "./ProfitLedgerListItem";
import { ProfitTotalsCard } from "./ProfitTotalsCard";

/** Sólo se muestra la etiqueta cada 3 horas (0h, 3h, 6h…) — 24 etiquetas juntas no entran
 *  legibles en el ancho de un teléfono; las 24 barras se siguen dibujando igual. */
const HOUR_LABEL_STEP = 3;

interface DayProfitViewProps {
  from: Date;
  to: Date;
}

/**
 * Ganancia de UN día puntual: gráfico por hora (0 a 23) + el mismo historial combinado
 * (ventas + ajustes de caja, ver `features/profits/data/ledger.ts`) acotado a ese día. Reusada por
 * el modo "Diario" de `ProfitsScreen` (hoy, inline) y por `ProfitDayDetailScreen` (un día pasado,
 * al tocar una barra del gráfico semanal) — un único lugar para no mantener esta vista dos veces.
 */
export function DayProfitView({ from, to }: DayProfitViewProps) {
  const { colors } = useTheme();
  const query = useProfitLedger({ from, to });

  const totals = useMemo(() => sumLedgerEntries(query.data ?? []), [query.data]);
  const hourlyBars = useMemo(() => {
    const hourly = bucketEntriesByHour(query.data ?? []);
    return hourly.map((hour) => ({
      date: String(hour.hour),
      label: hour.hour % HOUR_LABEL_STEP === 0 ? hour.label : "",
      revenue: hour.revenue,
      cost: hour.cost,
      profit: hour.profit,
    }));
  }, [query.data]);

  if (query.isPending) return <LoadingState message="Cargando…" />;
  if (query.isError) {
    return <ErrorState message="No se pudo cargar el detalle del día." onRetry={query.refetch} />;
  }

  return (
    <View style={styles.container}>
      <ProfitTotalsCard {...totals} />

      <Card>
        <Text style={[typography.label, { color: colors.mutedForeground, marginBottom: spacing.lg }]}>
          Por hora
        </Text>
        <ProfitChart data={hourlyBars} />
      </Card>

      {query.data.length === 0 ? (
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
          {query.data.map((item) => (
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
