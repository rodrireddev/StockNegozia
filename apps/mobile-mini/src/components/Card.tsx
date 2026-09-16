import { StyleSheet, View, type ViewProps } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { radius, spacing } from "@/theme/tokens";

export function Card({ style, children, ...props }: ViewProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.secondary, borderColor: colors.border },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
  },
});
