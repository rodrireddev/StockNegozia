import { StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { useTheme } from "@/theme/useTheme";
import { spacing, typography } from "@/theme/tokens";

const currencyFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

export function ProfitTotalsCard({
  revenue,
  cost,
  profit,
}: {
  revenue: number;
  cost: number;
  profit: number;
}) {
  const { colors } = useTheme();
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Text style={[typography.caption, { color: colors.mutedForeground }]}>Vendido</Text>
        <Text style={[typography.caption, { color: colors.mutedForeground }]}>Costo</Text>
        <Text style={[typography.label, { color: colors.mutedForeground }]}>Ganancia</Text>
      </View>
      <View style={styles.row}>
        <Text style={[typography.bodyStrong, { color: colors.foreground }]}>
          {currencyFormatter.format(revenue)}
        </Text>
        <Text style={[typography.bodyStrong, { color: colors.foreground }]}>
          {currencyFormatter.format(cost)}
        </Text>
        <Text style={[typography.bodyStrong, { color: profit < 0 ? colors.danger : colors.success }]}>
          {currencyFormatter.format(profit)}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  row: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
});
