import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { radius, spacing, typography } from "@/theme/tokens";

export type StatusPillTone = "neutral" | "success" | "danger" | "warning";

export function StatusPill({ label, tone = "neutral" }: { label: string; tone?: StatusPillTone }) {
  const { colors } = useTheme();
  const color =
    tone === "success"
      ? colors.success
      : tone === "danger"
        ? colors.danger
        : tone === "warning"
          ? colors.warning
          : colors.mutedForeground;

  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    alignSelf: "flex-start",
  },
  dot: { width: 8, height: 8, borderRadius: radius.full },
  label: { ...typography.label },
});
