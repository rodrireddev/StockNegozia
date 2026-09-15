import { useCallback, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import {
  parsePairingPayload,
  type ParsedPairingPayload,
} from "@/features/pairing/parsePairingPayload";
import { Button } from "@/components/Button";
import { WizardHeader } from "../WizardHeader";
import { useTheme } from "@/theme/useTheme";
import { radius, spacing, typography } from "@/theme/tokens";

export interface ScanStepProps {
  onScanned: (payload: ParsedPairingPayload) => void;
  onBack: () => void;
}

/**
 * Escaneo real de cámara (`expo-camera`) — reemplaza el "pegar el JSON del QR" que usaba M15. El
 * contrato interno sigue siendo el mismo `parsePairingPayload`/`ParsedPairingPayload` que ya
 * existía (ver `src/features/scanner/types.ts` para el contrato genérico preparado a futuro para
 * escanear productos, que sigue sin implementarse — esto es específico del QR de pairing).
 */
export function ScanStep({ onScanned, onBack }: ScanStepProps) {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanError, setScanError] = useState<string | null>(null);
  // Evita procesar el mismo QR varias veces mientras la cámara sigue enfocándolo — se resetea
  // solo si el QR leído no era válido, para permitir reintentar con otro código.
  const lockedRef = useRef(false);

  const handleBarcodeScanned = useCallback(
    ({ data }: BarcodeScanningResult) => {
      if (lockedRef.current) return;
      lockedRef.current = true;

      const parsed = parsePairingPayload(data);
      if (!parsed) {
        setScanError("Este código QR no es válido. Probá con el que muestra el Desktop.");
        lockedRef.current = false;
        return;
      }

      setScanError(null);
      onScanned(parsed);
    },
    [onScanned],
  );

  if (!permission) {
    return (
      <View style={styles.container}>
        <WizardHeader title="Escanear código QR" step={3} totalSteps={5} onBack={onBack} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <WizardHeader title="Escanear código QR" step={3} totalSteps={5} onBack={onBack} />
        <View style={styles.centerContent}>
          <Text style={[styles.message, { color: colors.foreground }]}>
            StockNegozia necesita acceso a la cámara únicamente para leer el código QR de
            emparejamiento. No se guarda ni se envía ninguna foto o video.
          </Text>
          <Button
            label={permission.canAskAgain ? "Permitir cámara" : "Abrir configuración"}
            onPress={requestPermission}
            testID="camera-permission-request"
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WizardHeader title="Escanear código QR" step={3} totalSteps={5} onBack={onBack} />
      <View style={styles.cameraWrapper}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={handleBarcodeScanned}
        />
        <View style={[styles.frame, { borderColor: colors.primary }]} />
      </View>
      <Text style={[styles.hint, { color: colors.mutedForeground }]}>
        Apuntá la cámara al código QR que muestra el Desktop.
      </Text>
      {scanError && <Text style={[styles.error, { color: colors.danger }]}>{scanError}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: spacing.md },
  centerContent: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.lg },
  message: { ...typography.body, textAlign: "center" },
  cameraWrapper: {
    flex: 1,
    borderRadius: radius.lg,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  camera: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  frame: {
    width: "70%",
    aspectRatio: 1,
    borderWidth: 3,
    borderRadius: radius.lg,
  },
  hint: { ...typography.caption, textAlign: "center" },
  error: { ...typography.caption, textAlign: "center" },
});
