import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Smartphone } from "lucide-react-native";
import { useDeviceInfo } from "@/devices/useDeviceInfo";
import { useAuth } from "@/auth/AuthContext";
import { useAuthErrorRedirect } from "@/auth/useAuthErrorRedirect";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { StatusPill } from "@/components/StatusPill";
import { useTheme } from "@/theme/useTheme";
import { spacing, typography } from "@/theme/tokens";

const DEVICE_TYPE_LABEL: Record<string, string> = {
  desktop: "Escritorio",
  mobile: "Celular",
  tablet: "Tablet",
  web: "Web",
  other: "Otro",
};

/**
 * Renombrado de "Dispositivo" a "Ajustes" — esto NUNCA fue administración de dispositivos (no
 * lista otros dispositivos, no revoca, no genera pairing): solo muestra el estado del propio
 * dispositivo y permite desvincularlo localmente. La administración real sigue siendo exclusiva
 * de Desktop (`AdminDeviceGuard` en el backend, ver el plan de M15).
 */
export function SettingsScreen() {
  const query = useDeviceInfo();
  const auth = useAuth();
  const { colors } = useTheme();
  useAuthErrorRedirect(query.error);

  return (
    <ScreenContainer>
      <Text style={[styles.title, { color: colors.foreground }]}>Ajustes</Text>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
  deviceCard: { gap: spacing.md },
  deviceHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  deviceHeaderText: { gap: 2 },
  deviceName: { ...typography.subtitle },
  deviceMeta: { ...typography.caption },
  signOutHint: { ...typography.caption, textAlign: "center" },
});
