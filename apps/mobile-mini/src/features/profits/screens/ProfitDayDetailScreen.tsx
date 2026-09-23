import { useMemo } from "react";
import { ScrollView, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/ScreenContainer";
import { useTheme } from "@/theme/useTheme";
import { spacing, typography } from "@/theme/tokens";
import { DayProfitView } from "../components/DayProfitView";
import { dayBounds, parseDateKey } from "../data/ledger";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

/** Detalle de ganancia de UN día puntual — se abre al tocar una barra del gráfico semanal (ver
 *  `ProfitChart`/`ProfitsScreen`). `date` viene como `YYYY-MM-DD` (mismo formato que
 *  `DailyProfitDto.date`). El contenido en sí (gráfico por hora + historial) es el mismo
 *  `DayProfitView` que usa el modo "Diario" de Ganancias para hoy. */
export function ProfitDayDetailScreen() {
  const { colors } = useTheme();
  const { date } = useLocalSearchParams<{ date: string }>();
  const { from, to } = useMemo(() => dayBounds(parseDateKey(date ?? "")), [date]);
  const label = useMemo(() => dateFormatter.format(from), [from]);

  return (
    <ScreenContainer>
      <Text style={[typography.title, { color: colors.foreground, marginBottom: spacing.md }]}>
        {label}
      </Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        <DayProfitView from={from} to={to} />
      </ScrollView>
    </ScreenContainer>
  );
}
