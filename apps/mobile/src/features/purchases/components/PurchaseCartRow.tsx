import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { X } from "lucide-react-native";
import type { PurchaseCartItem } from "../hooks/usePurchaseCart";
import { Card } from "@/components/Card";
import { QuantityStepper } from "@/components/QuantityStepper";
import { useTheme } from "@/theme/useTheme";
import { minTouchTarget, radius, spacing, typography } from "@/theme/tokens";

const currencyFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

export interface PurchaseCartRowProps {
  item: PurchaseCartItem;
  onSetQuantity: (quantity: number) => void;
  onSetUnitCost: (unitCost: number) => void;
  onRemove: () => void;
}

export function PurchaseCartRow({ item, onSetQuantity, onSetUnitCost, onRemove }: PurchaseCartRowProps) {
  const { colors } = useTheme();
  const [costText, setCostText] = useState(String(item.unitCost));

  function commitCost() {
    const value = Number(costText);
    if (Number.isFinite(value) && value >= 0) {
      onSetUnitCost(value);
    } else {
      setCostText(String(item.unitCost));
    }
  }

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.info}>
          <Text style={[typography.bodyStrong, { color: colors.foreground }]}>{item.name}</Text>
          <Text style={[typography.caption, { color: colors.mutedForeground }]}>{item.sku}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Quitar ${item.name} de la compra`}
          onPress={onRemove}
          hitSlop={8}
        >
          <X color={colors.mutedForeground} size={18} />
        </Pressable>
      </View>
      <View style={styles.footer}>
        <QuantityStepper
          quantity={item.quantity}
          onIncrement={() => onSetQuantity(item.quantity + 1)}
          onDecrement={() => onSetQuantity(Math.max(1, item.quantity - 1))}
        />
        <View style={styles.costField}>
          <Text style={[typography.caption, { color: colors.mutedForeground }]}>Costo</Text>
          <TextInput
            value={costText}
            onChangeText={setCostText}
            onBlur={commitCost}
            onSubmitEditing={commitCost}
            keyboardType="decimal-pad"
            accessibilityLabel={`Costo unitario de ${item.name}`}
            style={[
              styles.costInput,
              { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background },
            ]}
          />
        </View>
      </View>
      <Text style={[typography.caption, { color: colors.mutedForeground, textAlign: "right" }]}>
        Subtotal: {currencyFormatter.format(item.unitCost * item.quantity)}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  header: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  info: { gap: 2, flex: 1 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  costField: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  costInput: {
    minWidth: 72,
    minHeight: minTouchTarget,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    textAlign: "right",
  },
});
