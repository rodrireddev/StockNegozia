import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { ScreenContainer } from "@/components/ScreenContainer";
import { spacing, typography } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";
import { ONBOARDING_SLIDES } from "../data/slides";

export interface OnboardingScreenProps {
  /** Se llama al terminar el último slide o al tocar "Saltar". */
  onFinish: () => void;
}

/**
 * Explica el sistema de créditos/anuncios (doc ADS_CREDITS_GAMIFICATION.md) antes de que la
 * persona entre a "Beneficios" por primera vez. Botones "Siguiente"/"Entendido" en vez de swipe:
 * más explícito para alguien que no usa apps con gestos de carrusel seguido (público real de esta
 * app, doc §5).
 */
export function OnboardingScreen({ onFinish }: OnboardingScreenProps) {
  const { colors } = useTheme();
  const [index, setIndex] = useState(0);
  const slide = ONBOARDING_SLIDES[index]!;
  const isLast = index === ONBOARDING_SLIDES.length - 1;

  return (
    <ScreenContainer style={styles.container}>
      <View style={[styles.skipRow, isLast && styles.skipRowHidden]}>
        <Button label="Saltar" variant="ghost" onPress={onFinish} disabled={isLast} />
      </View>

      <View style={styles.content}>
        <slide.icon color={colors.primary} size={64} />
        <Text style={[typography.title, { color: colors.foreground, textAlign: "center" }]}>
          {slide.title}
        </Text>
        <Text style={[typography.body, { color: colors.mutedForeground, textAlign: "center" }]}>
          {slide.body}
        </Text>
      </View>

      <View style={styles.dots}>
        {ONBOARDING_SLIDES.map((_, dotIndex) => (
          <View
            key={dotIndex}
            style={[
              styles.dot,
              { backgroundColor: dotIndex === index ? colors.primary : colors.border },
            ]}
          />
        ))}
      </View>

      <Button
        label={isLast ? "Entendido, ¡empecemos!" : "Siguiente"}
        onPress={() => (isLast ? onFinish() : setIndex((current) => current + 1))}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: "space-between" },
  skipRow: { alignItems: "flex-end" },
  skipRowHidden: { opacity: 0 },
  content: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.lg, padding: spacing.lg },
  dots: { flexDirection: "row", justifyContent: "center", gap: spacing.sm, marginBottom: spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
