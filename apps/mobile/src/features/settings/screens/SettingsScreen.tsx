import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Check, Smartphone } from "lucide-react-native";
import { useDeviceInfo } from "@/devices/useDeviceInfo";
import { useAuth } from "@/auth/AuthContext";
import { useAuthErrorRedirect } from "@/auth/useAuthErrorRedirect";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { StatusPill } from "@/components/StatusPill";
import { TextField } from "@/components/TextField";
import { useThemeMode, type ThemeMode } from "@/theme/ThemeContext";
import { minTouchTarget, radius, spacing, typography } from "@/theme/tokens";
import { useSettings } from "../hooks/useSettings";
import { useUpdateSettings } from "../hooks/useUpdateSettings";

const DEVICE_TYPE_LABEL: Record<string, string> = {
  desktop: "Escritorio",
  mobile: "Celular",
  tablet: "Tablet",
  web: "Web",
  other: "Otro",
};

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
 * "Nombre del negocio" reemplaza a "StockNegozia" en el encabezado del recibo PDF que genera el
 * backend (ver apps/backend/src/core/sales/sale-receipt.pdf.ts) — es un ajuste global del backend
 * (tabla `app_meta`), no de este dispositivo, así que también lo puede cambiar Desktop.
 */
function BusinessNameCard() {
  const { colors } = useThemeMode();
  const settings = useSettings();
  const updateSettings = useUpdateSettings();
  const [value, setValue] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (settings.data) setValue(settings.data.businessName ?? "");
  }, [settings.data]);

  function handleSave() {
    setSuccessMessage(null);
    const trimmed = value.trim();
    updateSettings.mutate(
      { businessName: trimmed.length > 0 ? trimmed : null },
      { onSuccess: () => setSuccessMessage("Nombre del negocio actualizado.") },
    );
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
        label={updateSettings.isPending ? "Guardando…" : "Guardar"}
        onPress={handleSave}
        disabled={updateSettings.isPending}
        loading={updateSettings.isPending}
      />
    </Card>
  );
}

/**
 * Renombrado de "Dispositivo" a "Ajustes" — esto NUNCA fue administración de dispositivos (no
 * lista otros dispositivos, no revoca, no genera pairing): solo muestra el estado del propio
 * dispositivo y permite desvincularlo localmente. La administración real sigue siendo exclusiva
 * de Desktop (`AdminDeviceGuard` en el backend, ver el plan de M15).
 */
export function SettingsScreen() {
  const query = useDeviceInfo();
  const auth = useAuth();
  const { colors, mode, setMode } = useThemeMode();
  useAuthErrorRedirect(query.error);

  return (
    <ScreenContainer>
      <Text style={[styles.title, { color: colors.foreground }]}>Ajustes</Text>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[typography.subtitle, { color: colors.foreground }]}>Datos del negocio</Text>
        <BusinessNameCard />

        <Text style={[typography.subtitle, { color: colors.foreground }]}>Este dispositivo</Text>
        {query.isPending ? (
          <LoadingState message="Consultando estado del dispositivo…" />
        ) : query.isError ? (
          <ErrorState
            message="No se pudo consultar el estado del dispositivo."
            onRetry={query.refetch}
          />
        ) : (
          <Card style={styles.deviceCard}>
            <View style={styles.deviceHeader}>
              <Smartphone color={colors.foreground} size={28} />
              <View style={styles.deviceHeaderText}>
                <Text style={[styles.deviceName, { color: colors.foreground }]}>
                  {query.data.name}
                </Text>
                <Text style={[styles.deviceMeta, { color: colors.mutedForeground }]}>
                  {DEVICE_TYPE_LABEL[query.data.type] ?? query.data.type}
                </Text>
              </View>
            </View>
            <StatusPill
              label={query.data.active ? "Autorizado" : "Revocado"}
              tone={query.data.active ? "success" : "danger"}
            />
          </Card>
        )}

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

        <Button label="Olvidar este dispositivo" variant="danger" onPress={auth.signOut} />
        <Text style={[styles.signOutHint, { color: colors.mutedForeground }]}>
          Esto borra la credential guardada en este teléfono. El dispositivo sigue existiendo en
          StockNegozia hasta que se revoque desde el Desktop.
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.title, marginBottom: spacing.md },
  content: { gap: spacing.lg, paddingBottom: spacing.xxl },
  businessCard: { gap: spacing.md },
  deviceCard: { gap: spacing.md },
  deviceHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  deviceHeaderText: { gap: 2 },
  deviceName: { ...typography.subtitle },
  deviceMeta: { ...typography.caption },
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
  signOutHint: { ...typography.caption, textAlign: "center" },
});
