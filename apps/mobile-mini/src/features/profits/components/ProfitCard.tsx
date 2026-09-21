import { StyleSheet, Text, View } from "react-native";
import type { ProfitEntryDto } from "@/features/profits/data/service";
import { Card } from "@/components/Card";
import { useTheme } from "@/theme/useTheme";
import { spacing, typography } from "@/theme/tokens";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" });
const currencyFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={[typography.caption, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[typography.bodyStrong, { color }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

/**
 * Cada línea muestra sus tres montos con la etiqueta SIEMPRE arriba del valor (mismo criterio que
 * `TotalsCard` en `ProfitsScreen`) — antes la ganancia iba sola, sin etiqueta, arriba a la derecha
 * del nombre del producto, fácil de confundir con el precio de venta.
 */
export function ProfitCard({ entry }: { entry: ProfitEntryDto }) {
  const { colors } = useTheme();
  const profitColor = entry.profit < 0 ? colors.danger : colors.success;

  return (
    <Card style={styles.card}>
      <View>
        <Text style={[typography.bodyStrong, { color: colors.foreground }]} numberOfLines={1}>
          {entry.productName}
        </Text>
        <Text style={[typography.caption, { color: colors.mutedForeground }]}>
          {dateFormatter.format(new Date(entry.createdAt))} · Venta #{entry.saleId} ·{" "}
          {entry.quantity} un. × {currencyFormatter.format(entry.unitPrice)}
        </Text>
      </View>
      <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
        <Stat label="Vendido" value={currencyFormatter.format(entry.revenue)} color={colors.foreground} />
        <Stat label="Costo" value={currencyFormatter.format(entry.cost)} color={colors.foreground} />
        <Stat label="Ganancia" value={currencyFormatter.format(entry.profit)} color={profitColor} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  stat: { alignItems: "flex-start", gap: 2 },
});
