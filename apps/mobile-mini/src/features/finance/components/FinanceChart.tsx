import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { FinanceSeriesPointDto } from "@stocknegozia/api-contracts";
import { buildChartScale, formatMoney, formatMoneyCompact } from "@stocknegozia/shared";
import { useTheme } from "@/theme/useTheme";
import { radius, spacing, typography } from "@/theme/tokens";

export type FinanceChartMetric = "profit" | "revenue" | "purchases" | "withdrawals";

const PLOT_HEIGHT = 160;
const Y_AXIS_WIDTH = 52;
/** Con más barras (24 horas, 30 días) no entra el valor arriba de cada una. */
const MAX_BARS_WITH_VALUE_LABEL = 7;

const DETAIL_ROWS: Record<
  FinanceChartMetric,
  { key: keyof FinanceSeriesPointDto; label: string }[]
> = {
  profit: [
    { key: "revenue", label: "Vendido" },
    { key: "cost", label: "Costo" },
    { key: "profit", label: "Ganancia" },
  ],
  revenue: [
    { key: "revenue", label: "Vendido" },
    { key: "cost", label: "Costo" },
    { key: "profit", label: "Ganancia" },
  ],
  purchases: [{ key: "purchases", label: "Compras" }],
  withdrawals: [{ key: "withdrawals", label: "Retiros" }],
};

/**
 * Barras del período (por hora o por día) hechas con `View`s, sin librería: escala "linda"
 * (`buildChartScale`), eje Y, líneas guía y valores compactos. Tocar una barra muestra el detalle
 * con los montos completos debajo. Mismo componente en `apps/mobile` y misma lógica que
 * `FinanceChart` de Desktop.
 */
export function FinanceChart({
  data,
  metric,
}: {
  data: FinanceSeriesPointDto[];
  metric: FinanceChartMetric;
}) {
  const { colors } = useTheme();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const scale = buildChartScale(data.map((point) => point[metric]));
  const range = scale.max - scale.min || 1;
  const toY = (value: number) => ((scale.max - value) / range) * PLOT_HEIGHT;
  const zeroY = toY(0);
  const showValueLabels = data.length <= MAX_BARS_WITH_VALUE_LABEL;
  // Etiquetas del eje X espaciadas para que no se pisen en un teléfono.
  const xLabelEvery = Math.max(1, Math.ceil(data.length / 7));
  const selected = selectedIndex !== null ? data[selectedIndex] : undefined;
  const barColor = {
    profit: colors.success,
    revenue: colors.primary,
    purchases: colors.warning,
    withdrawals: colors.danger,
  }[metric];

  return (
    <View style={styles.container}>
      <View style={styles.chartRow}>
        <View style={[styles.yAxis, { height: PLOT_HEIGHT }]}>
          {scale.ticks.map((tick) => (
            <Text
              key={tick}
              style={[styles.tickLabel, { top: toY(tick) - 7, color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              {formatMoneyCompact(tick)}
            </Text>
          ))}
        </View>

        <View style={[styles.plot, { height: PLOT_HEIGHT }]}>
          {scale.ticks.map((tick) => (
            <View
              key={tick}
              style={[
                styles.gridLine,
                { top: toY(tick), backgroundColor: colors.border, opacity: tick === 0 ? 1 : 0.5 },
              ]}
            />
          ))}

          <View style={StyleSheet.absoluteFill}>
            <View style={styles.barsRow}>
              {data.map((point, index) => {
                const value = point[metric];
                const top = value >= 0 ? toY(value) : zeroY;
                const height = Math.max(value === 0 ? 0 : 2, Math.abs(toY(value) - zeroY));
                const isSelected = selectedIndex === index;
                return (
                  <Pressable
                    key={point.key}
                    testID={`chart-bar-${point.key}`}
                    accessibilityRole="button"
                    accessibilityLabel={`${point.label}: ${formatMoney(value)}`}
                    onPress={() => setSelectedIndex(isSelected ? null : index)}
                    style={[styles.column, isSelected && { backgroundColor: colors.accent }]}
                  >
                    {showValueLabels && value !== 0 ? (
                      <Text
                        style={[
                          styles.valueLabel,
                          { color: colors.mutedForeground },
                          value > 0 ? { top: Math.max(0, top - 14) } : { top: top + height + 2 },
                        ]}
                        numberOfLines={1}
                      >
                        {formatMoneyCompact(value)}
                      </Text>
                    ) : null}
                    <View
                      style={[
                        styles.bar,
                        {
                          top,
                          height,
                          backgroundColor: value < 0 ? colors.danger : barColor,
                          opacity: selectedIndex !== null && !isSelected ? 0.5 : 1,
                        },
                      ]}
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </View>

      {/* Etiquetas posicionadas en el centro de su barra con ancho propio: con 24 barras la
          columna mide ~12dp y "12h" no entraría dentro de ella. */}
      <View style={[styles.xAxis, { marginLeft: Y_AXIS_WIDTH }]}>
        {data.map((point, index) =>
          index % xLabelEvery === 0 || selectedIndex === index ? (
            <Text
              key={point.key}
              style={[
                styles.xLabel,
                {
                  left: `${((index + 0.5) / data.length) * 100}%`,
                  color: selectedIndex === index ? colors.foreground : colors.mutedForeground,
                },
              ]}
              numberOfLines={1}
            >
              {point.label}
            </Text>
          ) : null,
        )}
      </View>

      {selected ? (
        <View style={[styles.detail, { borderColor: colors.border }]} testID="chart-detail">
          <Text style={[typography.label, { color: colors.foreground }]}>{selected.label}</Text>
          {DETAIL_ROWS[metric].map((row) => {
            const value = selected[row.key] as number;
            const highlight = row.key === "profit" || row.key === metric;
            const color =
              row.key === "profit"
                ? value < 0
                  ? colors.danger
                  : colors.success
                : colors.foreground;
            return (
              <View key={row.key} style={styles.detailRow}>
                <Text style={[typography.caption, { color: colors.mutedForeground }]}>
                  {row.label}
                </Text>
                <Text
                  style={[
                    highlight ? typography.bodyStrong : typography.body,
                    styles.detailValue,
                    { color },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {formatMoney(value)}
                </Text>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={[typography.caption, styles.hint, { color: colors.mutedForeground }]}>
          Tocá una barra para ver el detalle.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  chartRow: { flexDirection: "row" },
  yAxis: { width: Y_AXIS_WIDTH, position: "relative" },
  tickLabel: { position: "absolute", right: spacing.xs, fontSize: 10, lineHeight: 14 },
  plot: { flex: 1, position: "relative" },
  gridLine: { position: "absolute", left: 0, right: 0, height: StyleSheet.hairlineWidth },
  barsRow: { flex: 1, flexDirection: "row", gap: 1 },
  column: { flex: 1, position: "relative", borderRadius: radius.sm },
  valueLabel: { position: "absolute", left: -6, right: -6, fontSize: 9, textAlign: "center" },
  bar: { position: "absolute", width: "60%", left: "20%", borderRadius: radius.sm },
  xAxis: { height: 16, position: "relative" },
  xLabel: { position: "absolute", width: 44, marginLeft: -22, textAlign: "center", fontSize: 11 },
  hint: { textAlign: "center", marginTop: spacing.xs },
  detail: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    gap: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  detailValue: { flexShrink: 1, textAlign: "right" },
});
