import { StyleSheet, Text, View } from "react-native";
import { TriangleAlert } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { spacing, typography } from "@/theme/tokens";
import { Button } from "./Button";

export interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.container} accessibilityRole="alert">
      <TriangleAlert color={colors.danger} size={32} />
      <Text style={[styles.message, { color: colors.foreground }]}>{message}</Text>
      {onRetry ? <Button label="Reintentar" variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.lg,
  },
  message: { ...typography.body, textAlign: "center" },
});
