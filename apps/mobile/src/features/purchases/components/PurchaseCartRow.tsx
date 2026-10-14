import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { X } from "lucide-react-native";
import {
  formatMoney,
  formatMoneyInputText,
  moneyToInputText,
  parseMoneyInput,
} from "@stocknegozia/shared";
import type { PurchaseCartItem } from "../hooks/usePurchaseCart";
import { Card } from "@/components/Card";
import { QuantityStepper } from "@/components/QuantityStepper";
import { useTheme } from "@/theme/useTheme";
import { minTouchTarget, radius, spacing, typography } from "@/theme/tokens";

export interface PurchaseCartRowProps {
  item: PurchaseCartItem;
  onSetQuantity: (quantity: number) => void;
  onSetUnitCost: (unitCost: number) => void;
  onRemove: () => void;
}

export function PurchaseCartRow({
  item,
  onSetQuantity,
  onSetUnitCost,
  onRemove,
}: PurchaseCartRowProps) {
  const { colors } = useTheme();
  const [costText, setCostText] = useState(() => moneyToInputText(item.unitCost));

  function commitCost() {
    const value = parseMoneyInput(costText);
    if (value !== null && value >= 0) {
      onSetUnitCost(value);
      setCostText(moneyToInputText(value));
    } else {
      setCostText(moneyToInputText(item.unitCost));
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
            onChangeText={(text) => setCostText(formatMoneyInputText(text, costText))}
            onBlur={commitCost}
            onSubmitEditing={commitCost}
            keyboardType="decimal-pad"
            accessibilityLabel={`Costo unitario de ${item.name}`}
            style={[
              styles.costInput,
              {
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
          />
        </View>
      </View>
      <Text
        style={[typography.caption, { color: colors.mutedForeground, textAlign: "right" }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        Subtotal: {formatMoney(item.unitCost * item.quantity)}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  header: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  info: { gap: 2, flex: 1 },
  footer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  costField: { flexDirection: "row", alignItems: "center", gap: spacing.xs, flexShrink: 1 },
  costInput: {
    // Ancho para "100.000.000,00" — antes 72dp mostraba sólo los últimos dígitos.
    minWidth: 128,
    minHeight: minTouchTarget,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    textAlign: "right",
  },
});
