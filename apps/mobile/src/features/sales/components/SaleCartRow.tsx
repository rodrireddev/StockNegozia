import { Pressable, StyleSheet, Text, View } from "react-native";
import { X } from "lucide-react-native";
import type { CartItem } from "../hooks/useCart";
import { Card } from "@/components/Card";
import { QuantityStepper } from "@/components/QuantityStepper";
import { useTheme } from "@/theme/useTheme";
import { spacing, typography } from "@/theme/tokens";

const currencyFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

export interface SaleCartRowProps {
  item: CartItem;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}

export function SaleCartRow({ item, onIncrement, onDecrement, onRemove }: SaleCartRowProps) {
  const { colors } = useTheme();
  const insufficientStock = item.quantity > item.availableStock;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.info}>
          <Text style={[typography.bodyStrong, { color: colors.foreground }]}>{item.name}</Text>
          <Text style={[typography.caption, { color: colors.mutedForeground }]}>{item.sku}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Quitar ${item.name} de la venta`}
          onPress={onRemove}
          hitSlop={8}
        >
          <X color={colors.mutedForeground} size={18} />
        </Pressable>
      </View>
      <View style={styles.footer}>
        <QuantityStepper quantity={item.quantity} onIncrement={onIncrement} onDecrement={onDecrement} />
        <Text style={[typography.bodyStrong, { color: colors.foreground }]}>
          {currencyFormatter.format(item.unitPrice * item.quantity)}
        </Text>
      </View>
      {insufficientStock && (
        <Text style={[typography.caption, { color: colors.warning }]}>
          Stock disponible: {item.availableStock}. Puede haber cambiado — se confirma al registrar
          la venta.
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  header: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  info: { gap: 2, flex: 1 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
