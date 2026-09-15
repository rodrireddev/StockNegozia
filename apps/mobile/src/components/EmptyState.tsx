import { StyleSheet, Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { PackageSearch } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { spacing, typography } from "@/theme/tokens";

export interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: LucideIcon;
}

export function EmptyState({ title, message, icon: Icon = PackageSearch }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <Icon color={colors.mutedForeground} size={40} />
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      {message ? (
        <Text style={[styles.message, { color: colors.mutedForeground }]}>{message}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.lg,
  },
  title: { ...typography.subtitle, textAlign: "center" },
  message: { ...typography.body, textAlign: "center" },
});
