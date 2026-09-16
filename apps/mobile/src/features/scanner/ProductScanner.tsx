import { useCallback, useRef, useState } from "react";
import { Modal as RNModal, Pressable, StyleSheet, Text, View } from "react-native";
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
  type BarcodeType,
} from "expo-camera";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { useTheme } from "@/theme/useTheme";
import { radius, spacing, typography } from "@/theme/tokens";
import type { ScanResult } from "./types";

const PRODUCT_BARCODE_TYPES: BarcodeType[] = [
  "qr",
  "ean13",
  "ean8",
  "upc_a",
  "upc_e",
  "code128",
  "code39",
  "codabar",
  "itf14",
];

export interface ProductScannerProps {
  visible: boolean;
  onDetected: (result: ScanResult) => void;
  onCancel: () => void;
}

/**
 * Scanner de cámara reutilizable para identificar productos (QR o barcode) — usado desde Búsqueda,
 * Alta de producto, Ventas y Compras. No conoce productos/ventas/compras: solo emite un
 * `ScanResult` y deja toda la lógica de negocio al consumidor (ver
 * docs/inventory/PRODUCT_SCANNER.md). Modelado sobre `features/pairing/components/steps/ScanStep`
 * (mismo manejo de permisos y de lecturas repetidas), con el agregado de entrada manual, que ese
 * paso de pairing no necesita porque ahí el QR es obligatorio.
 */
export function ProductScanner({ visible, onDetected, onCancel }: ProductScannerProps) {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [manualMode, setManualMode] = useState(false);
  const [manualValue, setManualValue] = useState("");
  // Evita procesar la misma lectura varias veces mientras la cámara sigue enfocando el código —
  // se resetea al cerrar/reabrir el modal (ver `handleClose`).
  const lockedRef = useRef(false);

  const handleBarcodeScanned = useCallback(
    ({ data, type }: BarcodeScanningResult) => {
      if (lockedRef.current) return;
      lockedRef.current = true;
      onDetected({ code: data, format: type });
    },
    [onDetected],
  );

  function handleClose() {
    lockedRef.current = false;
    setManualMode(false);
    setManualValue("");
    onCancel();
  }

  function handleManualSubmit() {
    const code = manualValue.trim();
    if (!code) return;
    setManualValue("");
    setManualMode(false);
    onDetected({ code, format: "manual" });
  }

  return (
    <RNModal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[typography.title, { color: colors.foreground }]}>Escanear producto</Text>
          <Pressable onPress={handleClose} accessibilityRole="button" testID="scanner-close">
            <Text style={{ color: colors.primary }}>Cerrar</Text>
          </Pressable>
        </View>

        {manualMode ? (
          <View style={styles.manualForm}>
            <TextField
              label="Código"
              placeholder="SKU o código de barras"
              value={manualValue}
              onChangeText={setManualValue}
              onSubmitEditing={handleManualSubmit}
              autoFocus
              autoCapitalize="none"
              returnKeyType="done"
              testID="scanner-manual-input"
            />
            <Button label="Buscar" onPress={handleManualSubmit} testID="scanner-manual-submit" />
            <Button
              label="Volver a la cámara"
              variant="ghost"
              onPress={() => setManualMode(false)}
            />
          </View>
        ) : !permission ? (
          <View style={styles.centerContent} />
        ) : !permission.granted ? (
          <View style={styles.centerContent}>
            <Text style={[typography.body, styles.message, { color: colors.foreground }]}>
              StockNegozia necesita acceso a la cámara para escanear el código del producto. No se
              guarda ni se envía ninguna foto o video.
            </Text>
            <Button
              label={permission.canAskAgain ? "Permitir cámara" : "Abrir configuración"}
              onPress={requestPermission}
              testID="scanner-permission-request"
            />
            <Button
              label="Ingresar manualmente"
              variant="ghost"
              onPress={() => setManualMode(true)}
            />
          </View>
        ) : (
          <>
            <View style={styles.cameraWrapper}>
              <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: PRODUCT_BARCODE_TYPES }}
                onBarcodeScanned={handleBarcodeScanned}
              />
              <View style={[styles.frame, { borderColor: colors.primary }]} />
            </View>
            <Text style={[typography.caption, styles.hint, { color: colors.mutedForeground }]}>
              Apuntá al código del producto
            </Text>
            <Button
              label="Ingresar manualmente"
              variant="ghost"
              onPress={() => setManualMode(true)}
            />
          </>
        )}
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, gap: spacing.md },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  centerContent: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.lg },
  message: { textAlign: "center" },
  manualForm: { flex: 1, gap: spacing.md, paddingTop: spacing.md },
  cameraWrapper: {
    flex: 1,
    borderRadius: radius.lg,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  camera: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  frame: { width: "70%", aspectRatio: 1, borderWidth: 3, borderRadius: radius.lg },
  hint: { textAlign: "center" },
});
