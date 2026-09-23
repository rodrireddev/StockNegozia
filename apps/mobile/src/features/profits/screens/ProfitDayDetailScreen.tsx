import { useMemo } from "react";
import { ScrollView, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/ScreenContainer";
import { useTheme } from "@/theme/useTheme";
import { spacing, typography } from "@/theme/tokens";
import { DayProfitView } from "../components/DayProfitView";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

/** `date` viene como `YYYY-MM-DD` (mismo formato que `DailyProfitDto.date`) — se parsea como
 *  fecha LOCAL (no UTC), para que el rango [00:00, 23:59:59.999) coincida con el mismo día que
 *  agrupó el gráfico semanal. */
function dayBounds(dateKey: string): { from: Date; to: Date; label: string } {
  const [year, month, day] = dateKey.split("-").map(Number);
  const from = new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1, 0, 0, 0, 0);
  const to = new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1, 23, 59, 59, 999);
  return { from, to, label: dateFormatter.format(from) };
}

/** Detalle de ganancia de UN día puntual — se abre al tocar una barra del gráfico semanal (ver
 *  `ProfitChart`/`ProfitsScreen`). El contenido en sí (gráfico por hora + historial) es el mismo
 *  `DayProfitView` que usa el modo "Diario" de Ganancias para hoy. */
export function ProfitDayDetailScreen() {
  const { colors } = useTheme();
  const { date } = useLocalSearchParams<{ date: string }>();
  const { from, to, label } = useMemo(() => dayBounds(date ?? ""), [date]);

  return (
    <ScreenContainer>
      <Text style={[typography.title, { color: colors.foreground, marginBottom: spacing.md }]}>
        {label}
      </Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        <DayProfitView date={date} from={from} to={to} />
      </ScrollView>
    </ScreenContainer>
  );
}
