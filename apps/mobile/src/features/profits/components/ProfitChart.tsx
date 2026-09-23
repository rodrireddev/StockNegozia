import { Pressable, StyleSheet, Text, View } from "react-native";
import type { DailyProfitDto } from "@stocknegozia/api-contracts";
import { useTheme } from "@/theme/useTheme";
import { radius, spacing, typography } from "@/theme/tokens";

const POSITIVE_ZONE_HEIGHT = 110;
const NEGATIVE_ZONE_HEIGHT = 40;

const compactCurrencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

interface ProfitChartProps {
  data: DailyProfitDto[];
  /** Al tocar un día se llama con su `date` (`YYYY-MM-DD`) — pensado para abrir el detalle de ese
   *  día. Sin esta prop las barras no son tocables (uso en un contexto de solo lectura). */
  onSelectDay?: (date: string) => void;
}

/**
 * Barras día vs. ganancia de la última semana. Sin librería de gráficos (no hay ninguna en el
 * proyecto): son `View`s con alto proporcional, suficiente para 7 barras y más liviano que armar
 * lo mismo con `react-native-svg`. Eje cero fijo entre dos "zonas" (positiva arriba, negativa
 * abajo) para poder mostrar un día con pérdida sin distorsionar la escala de los demás — un solo
 * `maxAbsProfit` comparte la escala de ambas zonas. Misma estructura que
 * `apps/mobile-mini/src/features/profits/components/ProfitChart.tsx`.
 */
export function ProfitChart({ data, onSelectDay }: ProfitChartProps) {
  const { colors } = useTheme();
  const hasNegative = data.some((day) => day.profit < 0);
  const maxAbsProfit = Math.max(1, ...data.map((day) => Math.abs(day.profit)));

  return (
    <View style={styles.container}>
      <View style={[styles.zone, { height: POSITIVE_ZONE_HEIGHT }]}>
        {data.map((day) => {
          const barHeight =
            day.profit > 0
              ? Math.max(4, (day.profit / maxAbsProfit) * (POSITIVE_ZONE_HEIGHT - 20))
              : 2;
          return (
            <Pressable
              key={day.date}
              style={styles.column}
              disabled={!onSelectDay}
              onPress={() => onSelectDay?.(day.date)}
            >
              <Text
                style={[typography.caption, styles.valueLabel, { color: colors.mutedForeground }]}
                numberOfLines={1}
              >
                {day.profit !== 0 ? compactCurrencyFormatter.format(day.profit) : ""}
              </Text>
              <View style={styles.barSlot}>
                <View
                  style={[
                    styles.bar,
                    { height: barHeight, backgroundColor: day.profit === 0 ? colors.border : colors.success },
                  ]}
                />
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.baseline, { backgroundColor: colors.border }]} />

      {hasNegative ? (
        <View style={[styles.zone, { height: NEGATIVE_ZONE_HEIGHT }]}>
          {data.map((day) => {
            const barHeight =
              day.profit < 0
                ? Math.max(4, (Math.abs(day.profit) / maxAbsProfit) * (NEGATIVE_ZONE_HEIGHT - 4))
                : 0;
            return (
              <View key={day.date} style={styles.column}>
                {barHeight > 0 ? (
                  <View style={[styles.bar, { height: barHeight, backgroundColor: colors.danger }]} />
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}

      <View style={styles.zone}>
        {data.map((day) => (
          <Pressable
            key={day.date}
            style={styles.column}
            disabled={!onSelectDay}
            onPress={() => onSelectDay?.(day.date)}
          >
            <Text style={[typography.caption, { color: colors.mutedForeground }]}>{day.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  zone: { flexDirection: "row" },
  column: { flex: 1, alignItems: "center" },
  valueLabel: { fontSize: 10, marginBottom: spacing.xs },
  barSlot: { flex: 1, justifyContent: "flex-end" },
  bar: { width: "55%", minWidth: 12, borderRadius: radius.sm, alignSelf: "center" },
  baseline: { height: StyleSheet.hairlineWidth },
});
