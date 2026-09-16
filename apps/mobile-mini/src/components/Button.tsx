import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type GestureResponderEvent,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import { minTouchTarget, radius, spacing, typography } from "@/theme/tokens";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

export interface ButtonProps {
  label: string;
  onPress: (event: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
}

/** Touch target mínimo de 48dp (Material/Android Accessibility Scanner) en cualquier variante. */
export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  testID,
}: ButtonProps) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;

  const backgroundColor = {
    primary: colors.primary,
    secondary: colors.secondary,
    danger: colors.danger,
    ghost: "transparent",
  }[variant];

  const textColor = {
    primary: colors.primaryForeground,
    secondary: colors.secondaryForeground,
    danger: colors.dangerForeground,
    ghost: colors.primary,
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      testID={testID}
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor,
          opacity: isDisabled ? 0.6 : pressed ? 0.85 : 1,
          borderWidth: variant === "ghost" ? 1 : 0,
          borderColor: colors.border,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: minTouchTarget,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  label: { ...typography.bodyStrong },
});
