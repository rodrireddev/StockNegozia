import { Pressable, StyleSheet, Text, View } from "react-native";
import { Check } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { minTouchTarget, radius, spacing, typography } from "@/theme/tokens";

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  testID?: string;
}

export function Checkbox({ checked, onChange, label, testID }: CheckboxProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      style={styles.row}
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      testID={testID}
    >
      <View
        style={[
          styles.box,
          {
            borderColor: checked ? colors.primary : colors.border,
            backgroundColor: checked ? colors.primary : "transparent",
          },
        ]}
      >
        {checked && <Check color={colors.primaryForeground} size={16} />}
      </View>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: minTouchTarget,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { ...typography.body, flex: 1 },
});
