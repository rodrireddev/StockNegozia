import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Check } from "lucide-react-native";
import { useAccount } from "@/accounts/AccountContext";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { TextField } from "@/components/TextField";
import { fireSetupQuestClaim } from "@/features/benefits/gamificationTriggers";
import { useThemeMode, type ThemeMode } from "@/theme/ThemeContext";
import { minTouchTarget, radius, spacing, typography } from "@/theme/tokens";
import { useBusinessName } from "../hooks/useBusinessName";

const THEME_MODE_OPTIONS: { mode: ThemeMode; label: string }[] = [
  { mode: "system", label: "Sistema" },
  { mode: "light", label: "Claro" },
  { mode: "dark", label: "Oscuro" },
  // Paletas alternativas pensadas para descansar la vista en sesiones largas — ver
  // `theme/themes.ts` para el detalle de cada una.
  { mode: "pastel", label: "Pastel" },
  { mode: "solarized", label: "Solarized" },
  { mode: "nord", label: "Nord" },
];

/**
 * "Nombre del negocio" reemplaza a "StockNegozia" en el encabezado del recibo PDF (ver
 * `features/sales/data/receipt.ts`) — persistido localmente, no hay backend en esta app.
 */
function BusinessNameCard() {
  const { colors } = useThemeMode();
  const { status: accountStatus } = useAccount();
  const businessName = useBusinessName();
  const [value, setValue] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (businessName.loaded) setValue(businessName.value ?? "");
  }, [businessName.loaded, businessName.value]);

  async function handleSave() {
    setSuccessMessage(null);
    const trimmed = value.trim();
    await businessName.save(trimmed.length > 0 ? trimmed : null);
    setSuccessMessage("Nombre del negocio actualizado.");
    // "Perfil completo" (doc §1, setup quest "profile_complete") = cargó el nombre del negocio —
    // el único dato de perfil que existe en esta app. Solo al ponerlo, nunca al borrarlo.
    if (trimmed.length > 0 && accountStatus === "authenticated") {
      fireSetupQuestClaim("profile_complete");
    }
  }

  return (
    <Card style={styles.businessCard}>
      <TextField
        label="Nombre del negocio"
        placeholder="Ej: Almacén Doña Rosa"
        value={value}
        onChangeText={(text) => {
          setValue(text);
          setSuccessMessage(null);
        }}
      />
      {successMessage && (
        <Text style={[typography.caption, { color: colors.success }]}>{successMessage}</Text>
      )}
      <Button
        label={businessName.isSaving ? "Guardando…" : "Guardar"}
        onPress={handleSave}
        disabled={businessName.isSaving}
        loading={businessName.isSaving}
      />
    </Card>
  );
}

/**
 * StockNegozia Mini es una única app local, sin dispositivos que administrar ni sesión que cerrar
 * — a diferencia de `apps/mobile` (que usa esta misma pantalla para el estado del dispositivo
 * pareado), acá Ajustes es sólo el selector de tema y el nombre del negocio.
 */
export function SettingsScreen() {
  const { colors, mode, setMode } = useThemeMode();

  return (
    <ScreenContainer>
      <Text style={[styles.title, { color: colors.foreground }]}>Ajustes</Text>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[typography.subtitle, { color: colors.foreground }]}>Datos del negocio</Text>
        <BusinessNameCard />

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
  businessCard: { gap: spacing.md },
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
