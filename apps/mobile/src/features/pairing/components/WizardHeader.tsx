import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { useTheme } from "@/theme/useTheme";
import { spacing, typography } from "@/theme/tokens";

export interface WizardHeaderProps {
  title: string;
  step: number;
  totalSteps: number;
  onBack?: () => void;
}

export function WizardHeader({ title, step, totalSteps, onBack }: WizardHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Atrás"
            hitSlop={12}
          >
            <ChevronLeft color={colors.foreground} size={24} />
          </Pressable>
        ) : (
          <View style={styles.backSpacer} />
        )}
        <Text style={[styles.step, { color: colors.mutedForeground }]}>
          Paso {step} de {totalSteps}
        </Text>
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backSpacer: { width: 24, height: 24 },
  step: { ...typography.caption },
  title: { ...typography.title },
});
