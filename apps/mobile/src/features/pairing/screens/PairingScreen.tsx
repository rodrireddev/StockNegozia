import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";
import * as Device from "expo-device";
import { QrCode } from "lucide-react-native";
import { useAuth } from "@/auth/AuthContext";
import { usePairDevice } from "@/features/pairing/hooks/usePairDevice";
import { parsePairingPayload } from "@/features/pairing/parsePairingPayload";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Card } from "@/components/Card";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { useDeviceSize } from "@/hooks/useDeviceSize";
import { useTheme } from "@/theme/useTheme";
import { spacing, typography } from "@/theme/tokens";

const defaultDeviceName = Device.deviceName ?? Device.modelName ?? "";

export function PairingScreen() {
  const auth = useAuth();
  const { isTablet } = useDeviceSize();
  const { colors } = useTheme();
  const pairMutation = usePairDevice();

  const [backendUrl, setBackendUrl] = useState(auth.backendUrl ?? "");
  const [qrPayload, setQrPayload] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [deviceName, setDeviceName] = useState(defaultDeviceName);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit() {
    setFormError(null);

    const trimmedUrl = backendUrl.trim();
    if (trimmedUrl.length === 0) {
      setFormError("Ingresá la dirección del backend.");
      return;
    }

    const parsed = parsePairingPayload(qrPayload.trim());
    if (!parsed) {
      setFormError(
        "El código QR pegado no es válido. Copiá el JSON completo mostrado en el Desktop.",
      );
      return;
    }

    if (!/^\d{6}$/.test(verificationCode.trim())) {
      setFormError("El código de verificación debe tener 6 dígitos.");
      return;
    }

    await auth.configureBackendUrl(trimmedUrl);

    pairMutation.mutate(
      {
        pairingId: parsed.pairingId,
        token: parsed.token,
        verificationCode: verificationCode.trim(),
        deviceName: deviceName.trim() || undefined,
        deviceType: isTablet ? "tablet" : "mobile",
      },
      {
        onError: (error) => {
          setFormError(
            error instanceof Error ? error.message : "No se pudo emparejar el dispositivo.",
          );
        },
      },
    );
  }

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <QrCode color={colors.primary} size={40} />
          <Text style={[styles.title, { color: colors.foreground }]}>Emparejar dispositivo</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Desde el Desktop de StockNegozia: Dispositivos → Emparejar dispositivo. Pegá acá el
            texto del código QR y el código de verificación que aparecen en pantalla.
          </Text>

          <Card style={styles.formCard}>
            <TextField
              label="URL del backend"
              value={backendUrl}
              onChangeText={setBackendUrl}
              placeholder="http://192.168.1.30:38123"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <TextField
              label="Contenido del QR"
              value={qrPayload}
              onChangeText={setQrPayload}
              placeholder='{"version":1,"type":"stocknegozia-pairing",...}'
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              numberOfLines={4}
              style={styles.multiline}
            />
            <TextField
              label="Código de verificación"
              value={verificationCode}
              onChangeText={setVerificationCode}
              placeholder="123456"
              keyboardType="number-pad"
              maxLength={6}
            />
            <TextField
              label="Nombre del dispositivo (opcional)"
              value={deviceName}
              onChangeText={setDeviceName}
              placeholder="Mi teléfono"
            />

            {formError ? (
              <Text style={[styles.error, { color: colors.danger }]}>{formError}</Text>
            ) : null}

            <Button
              label="Emparejar"
              onPress={handleSubmit}
              loading={pairMutation.isPending}
              testID="pairing-submit"
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: spacing.md, paddingBottom: spacing.xxl },
  title: { ...typography.title },
  subtitle: { ...typography.body },
  formCard: { gap: spacing.md, marginTop: spacing.md },
  multiline: { minHeight: 96, textAlignVertical: "top", paddingTop: spacing.sm },
  error: { ...typography.caption },
});
