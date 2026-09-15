import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Smartphone } from "lucide-react-native";
import { useDeviceInfo } from "@/devices/useDeviceInfo";
import { useAuth } from "@/auth/AuthContext";
import { useAuthErrorRedirect } from "@/auth/useAuthErrorRedirect";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
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

export function DeviceScreen() {
  const query = useDeviceInfo();
  const auth = useAuth();
  const { colors } = useTheme();
  const [backendUrlDraft, setBackendUrlDraft] = useState(auth.backendUrl ?? "");
  const [savingUrl, setSavingUrl] = useState(false);
  useAuthErrorRedirect(query.error);

  async function handleSaveBackendUrl() {
    setSavingUrl(true);
    try {
      await auth.configureBackendUrl(backendUrlDraft);
    } finally {
      setSavingUrl(false);
    }
  }

  return (
    <ScreenContainer>
      <Text style={[styles.title, { color: colors.foreground }]}>Este dispositivo</Text>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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

        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Backend</Text>
          <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>
            Dirección LAN del backend de StockNegozia (la misma que se ve en el Desktop al iniciar).
          </Text>
          <TextField
            label="URL del backend"
            value={backendUrlDraft}
            onChangeText={setBackendUrlDraft}
            placeholder="http://192.168.1.30:38123"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <Button
            label="Guardar"
            variant="secondary"
            onPress={handleSaveBackendUrl}
            loading={savingUrl}
            disabled={backendUrlDraft.trim().length === 0}
          />
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
  deviceCard: { gap: spacing.md },
  deviceHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  deviceHeaderText: { gap: 2 },
  deviceName: { ...typography.subtitle },
  deviceMeta: { ...typography.caption },
  section: { gap: spacing.md },
  sectionTitle: { ...typography.subtitle },
  sectionHint: { ...typography.caption },
  signOutHint: { ...typography.caption, textAlign: "center" },
});
