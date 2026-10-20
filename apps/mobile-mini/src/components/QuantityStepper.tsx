import { Pressable, StyleSheet, Text, View } from "react-native";
import { Minus, Plus } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { minTouchTarget, radius, typography } from "@/theme/tokens";

export interface QuantityStepperProps {
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  testID?: string;
}

/** +/- táctil para líneas de carrito (Ventas) — sin campo editable: la cantidad en Ventas siempre
 *  cambia de a 1 unidad, igual que Desktop. Compras usa un campo numérico aparte (cantidad Y costo
 *  unitario editables), ver `PurchaseCartLine`. */
export function QuantityStepper({
  quantity,
  onIncrement,
  onDecrement,
  testID,
}: QuantityStepperProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.row, { borderColor: colors.border }]} testID={testID}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Restar uno"
        onPress={onDecrement}
        style={styles.button}
      >
        <Minus color={colors.foreground} size={16} />
      </Pressable>
      <Text style={[styles.quantity, { color: colors.foreground }]}>{quantity}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sumar uno"
        onPress={onIncrement}
        style={styles.button}
      >
        <Plus color={colors.foreground} size={16} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
  },
  button: {
    minWidth: minTouchTarget,
    minHeight: minTouchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  quantity: { ...typography.bodyStrong, minWidth: 24, textAlign: "center" },
});
