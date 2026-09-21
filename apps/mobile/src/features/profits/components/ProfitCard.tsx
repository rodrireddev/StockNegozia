import { StyleSheet, Text, View } from "react-native";
import type { ProfitEntryDto } from "@stocknegozia/api-contracts";
import { describeMovementActor } from "@stocknegozia/shared";
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

/** Cada línea muestra sus tres montos con la etiqueta SIEMPRE arriba del valor (mismo criterio que
 *  `TotalsCard` en `ProfitsScreen`), para que la ganancia no se confunda con el precio de venta —
 *  más "Vendedor" (`describeMovementActor`), mismo dato que ya muestra `MovementCard`. */
export function ProfitCard({ entry }: { entry: ProfitEntryDto }) {
  const { colors } = useTheme();
  const profitColor = entry.profit < 0 ? colors.danger : colors.success;
  const actor = describeMovementActor(entry);

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
      {actor ? (
        <Text style={[typography.caption, { color: colors.mutedForeground }]}>Vendedor: {actor}</Text>
      ) : null}
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
