import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Check } from "lucide-react-native";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Card } from "@/components/Card";
import { useThemeMode, type ThemeMode } from "@/theme/ThemeContext";
import { minTouchTarget, radius, spacing, typography } from "@/theme/tokens";

const THEME_MODE_OPTIONS: { mode: ThemeMode; label: string }[] = [
  { mode: "system", label: "Sistema" },
  { mode: "light", label: "Claro" },
  { mode: "dark", label: "Oscuro" },
];

/**
 * StockNegozia Mini es una única app local, sin dispositivos que administrar ni sesión que cerrar
 * — a diferencia de `apps/mobile` (que usa esta misma pantalla para el estado del dispositivo
 * pareado), acá Ajustes es únicamente el selector de tema.
 */
export function SettingsScreen() {
  const { colors, mode, setMode } = useThemeMode();

  return (
    <ScreenContainer>
      <Text style={[styles.title, { color: colors.foreground }]}>Ajustes</Text>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[typography.subtitle, { color: colors.foreground }]}>Apariencia</Text>
        <Card style={styles.themeCard}>
          {THEME_MODE_OPTIONS.map((option) => {
            const selected = mode === option.mode;
            return (
              <Pressable
                key={option.mode}
                style={styles.themeRow}
                onPress={() => setMode(option.mode)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={option.label}
              >
                <Text style={[typography.body, { color: colors.foreground }]}>{option.label}</Text>
                <View
                  style={[
                    styles.themeRadio,
                    {
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? colors.primary : "transparent",
                    },
                  ]}
                >
                  {selected && <Check color={colors.primaryForeground} size={14} />}
                </View>
              </Pressable>
            );
          })}
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.title, marginBottom: spacing.md },
  content: { gap: spacing.lg, paddingBottom: spacing.xxl },
  themeCard: { padding: 0, overflow: "hidden" },
  themeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: minTouchTarget,
    paddingHorizontal: spacing.lg,
  },
  themeRadio: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
