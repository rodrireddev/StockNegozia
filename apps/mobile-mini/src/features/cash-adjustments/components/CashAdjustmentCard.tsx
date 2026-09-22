import { StyleSheet, Text, View } from "react-native";
import type { CashAdjustmentDto } from "@/features/cash-adjustments/data/service";
import { Card } from "@/components/Card";
import { useTheme } from "@/theme/useTheme";
import { spacing, typography } from "@/theme/tokens";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" });
const currencyFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

/** Mismo look que `ProfitCard` (etiqueta arriba del valor), para que una fila de ajuste de caja se
 *  lea igual de clara mezclada en el mismo historial que las ventas. */
export function CashAdjustmentCard({ adjustment }: { adjustment: CashAdjustmentDto }) {
  const { colors } = useTheme();
  const isOut = adjustment.direction === "OUT";
  const signedAmount = isOut ? -adjustment.amount : adjustment.amount;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={[typography.bodyStrong, { color: colors.foreground }]} numberOfLines={1}>
          {isOut ? "Retiro de caja" : "Ingreso de caja"}
        </Text>
        <Text
          style={[typography.bodyStrong, { color: isOut ? colors.danger : colors.success }]}
        >
          {currencyFormatter.format(signedAmount)}
        </Text>
      </View>
      <Text style={[typography.caption, { color: colors.mutedForeground }]}>
        {dateFormatter.format(new Date(adjustment.createdAt))}
      </Text>
      <Text style={[typography.caption, { color: colors.mutedForeground }]}>{adjustment.reason}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.xs },
  header: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
});
