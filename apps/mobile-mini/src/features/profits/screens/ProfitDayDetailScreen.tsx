import { useMemo } from "react";
import { FlatList, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { TrendingUp } from "lucide-react-native";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { ScreenContainer } from "@/components/ScreenContainer";
import { useTheme } from "@/theme/useTheme";
import { spacing, typography } from "@/theme/tokens";
import { ProfitLedgerListItem } from "../components/ProfitLedgerListItem";
import { ProfitTotalsCard } from "../components/ProfitTotalsCard";
import { sumLedgerEntries } from "../data/ledger";
import { useProfitLedger } from "../hooks/useProfitLedger";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

/** `date` viene como `YYYY-MM-DD` (mismo formato que `DailyProfitDto.date`) — se parsea como
 *  fecha LOCAL (no UTC), para que el rango [00:00, 23:59:59.999) coincida con el mismo día que
 *  agrupó el gráfico semanal (`ledger.ts` también agrupa en horario local). */
function parseDayRange(dateKey: string): { from: Date; to: Date; label: string } {
  const [year, month, day] = dateKey.split("-").map(Number);
  const from = new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1, 0, 0, 0, 0);
  const to = new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1, 23, 59, 59, 999);
  return { from, to, label: dateFormatter.format(from) };
}

/** Detalle de ganancia de UN día puntual — se abre al tocar una barra del gráfico semanal (ver
 *  `ProfitChart`/`ProfitsScreen`). Reusa el mismo historial combinado (ventas + ajustes de caja)
 *  que "Historial", sólo que acotado a ese día. */
export function ProfitDayDetailScreen() {
  const { colors } = useTheme();
  const { date } = useLocalSearchParams<{ date: string }>();
  const { from, to, label } = useMemo(() => parseDayRange(date ?? ""), [date]);

  const query = useProfitLedger({ from, to });
  const totals = useMemo(() => sumLedgerEntries(query.data ?? []), [query.data]);

  return (
    <ScreenContainer>
      <Text style={[typography.title, { color: colors.foreground, marginBottom: spacing.md }]}>
        {label}
      </Text>

      {query.isPending ? (
        <LoadingState message="Cargando…" />
      ) : query.isError ? (
        <ErrorState message="No se pudo cargar el detalle del día." onRetry={query.refetch} />
      ) : query.data.length === 0 ? (
        <EmptyState
          title="Sin movimientos"
          message="Ese día no hay ventas ni ajustes de caja registrados."
          icon={TrendingUp}
        />
      ) : (
        <FlatList
          data={query.data}
          keyExtractor={(item) => `${item.kind}-${item.id}`}
          contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.xxl }}
          ListHeaderComponent={<ProfitTotalsCard {...totals} />}
          ListHeaderComponentStyle={{ marginBottom: spacing.sm }}
          renderItem={({ item }) => <ProfitLedgerListItem entry={item} />}
          refreshing={query.isRefetching}
          onRefresh={query.refetch}
        />
      )}
    </ScreenContainer>
  );
}
