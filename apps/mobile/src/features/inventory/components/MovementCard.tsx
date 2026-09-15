import { StyleSheet, Text, View } from "react-native";
import type { ProductDto, StockMovementDto } from "@stocknegozia/api-contracts";
import {
  describeMovementReference,
  formatMovementUnitValue,
  formatSignedQuantity,
  MOVEMENT_TYPE_LABELS,
} from "@stocknegozia/shared";
import { Card } from "@/components/Card";
import { useTheme } from "@/theme/useTheme";
import { spacing, typography } from "@/theme/tokens";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" });

export function MovementCard({
  movement,
  product,
}: {
  movement: StockMovementDto;
  product: ProductDto | undefined;
}) {
  const { colors } = useTheme();
  const reference = describeMovementReference(movement);

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={[typography.bodyStrong, { color: colors.foreground }]} numberOfLines={1}>
          {product?.name ?? `Producto #${movement.productId}`}
        </Text>
        <Text
          style={[
            typography.bodyStrong,
            { color: movement.direction === "IN" ? colors.success : colors.foreground },
          ]}
        >
          {formatSignedQuantity(movement)}
        </Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={[typography.caption, { color: colors.mutedForeground }]}>
          {dateFormatter.format(new Date(movement.createdAt))} · {MOVEMENT_TYPE_LABELS[movement.type]}
        </Text>
        <Text style={[typography.caption, { color: colors.mutedForeground }]}>
          {formatMovementUnitValue(movement.unitValue)}
        </Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={[typography.caption, { color: colors.mutedForeground }]}>
          {reference ?? "—"}
        </Text>
        <Text style={[typography.caption, { color: colors.mutedForeground }]}>
          Stock: {movement.stockAfter}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.xs },
  header: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  metaRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
});
