import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal as RNModal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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

export interface ScanFeedback {
  type: "success" | "error";
  text1: string;
  text2?: string;
}

const FEEDBACK_FADE_MS = 180;
const FEEDBACK_HOLD_MS = 2200;

/**
 * Cooldown tras cada lectura antes de volver a aceptar otra — evita que el mismo frame se procese
 * dos veces mientras la cámara sigue enfocando el código. Antes de este ajuste, el "lock" solo se
 * liberaba cuando el consumidor cerraba y volvía a abrir el modal, lo que forzaba a `CameraView` a
 * desmontarse y reinicializar la sesión nativa de cámara (varios cientos de ms) — si se escaneaba
 * un segundo código antes de que esa reinicialización terminara, se perdía. Con el cooldown, la
 * cámara nunca se desmonta entre lecturas (el consumidor puede dejar el modal abierto para escanear
 * varios productos seguidos, ver Sales/PurchasesScreen) y el lock se libera solo, sin depender de
 * un remount.
 */
const RESCAN_COOLDOWN_MS = 1200;

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
  /**
   * Aviso opcional a mostrar tras resolver un escaneo (ej. "Producto agregado" o un error de
   * lookup) — pensado para el modo continuo de Ventas/Compras, donde el scanner se queda abierto
   * entre lecturas (ver esas pantallas). Cada objeto nuevo (aunque tenga el mismo texto que el
   * anterior) dispara la animación desde cero: no depende de comparar contenido, solo de que el
   * consumidor pase una referencia nueva en cada resultado — lo que ya hace naturalmente al armar
   * el objeto en cada `catch`/`then`.
   */
  feedback?: ScanFeedback | null;
}

/**
 * Scanner de cámara reutilizable para identificar productos (QR o barcode) — usado desde Búsqueda,
 * Alta de producto, Ventas y Compras. No conoce productos/ventas/compras: solo emite un
 * `ScanResult` y deja toda la lógica de negocio al consumidor (ver
 * docs/inventory/PRODUCT_SCANNER.md). Modelado sobre `features/pairing/components/steps/ScanStep`
 * (mismo manejo de permisos y de lecturas repetidas), con el agregado de entrada manual, que ese
 * paso de pairing no necesita porque ahí el QR es obligatorio.
 */
export function ProductScanner({ visible, onDetected, onCancel, feedback }: ProductScannerProps) {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [manualMode, setManualMode] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const lockedRef = useRef(false);
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [displayedFeedback, setDisplayedFeedback] = useState<ScanFeedback | null>(null);
  const feedbackOpacity = useRef(new Animated.Value(0)).current;
  const feedbackAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearTimeout(cooldownRef.current);
    };
  }, []);

  /**
   * Reproduce SIEMPRE la animación completa (fade in → hold → fade out) ante cada `feedback`
   * nuevo, sin importar si el texto es igual al anterior — a diferencia de
   * `react-native-toast-message` (usado antes acá), que solo anima la entrada cuando pasa de
   * oculto a visible: si ya había un toast visible, uno nuevo solo actualizaba el texto sin
   * animación, lo que en escaneo rápido y seguido se sentía como "el aviso pasa muy rápido o ni se
   * nota". Acá cada llamada corta cualquier animación anterior (`.stop()`) y arranca una nueva
   * desde cero, así que el tiempo visible es siempre el mismo, escaneo tras escaneo.
   */
  useEffect(() => {
    feedbackAnimationRef.current?.stop();
    if (!feedback) return;

    setDisplayedFeedback(feedback);
    feedbackOpacity.setValue(0);
    const animation = Animated.sequence([
      Animated.timing(feedbackOpacity, {
        toValue: 1,
        duration: FEEDBACK_FADE_MS,
        useNativeDriver: true,
      }),
      Animated.delay(FEEDBACK_HOLD_MS),
      Animated.timing(feedbackOpacity, {
        toValue: 0,
        duration: FEEDBACK_FADE_MS,
        useNativeDriver: true,
      }),
    ]);
    feedbackAnimationRef.current = animation;
    animation.start(({ finished }) => {
      if (finished) setDisplayedFeedback(null);
    });
  }, [feedback, feedbackOpacity]);

  const handleBarcodeScanned = useCallback(
    ({ data, type }: BarcodeScanningResult) => {
      if (lockedRef.current) return;
      lockedRef.current = true;
      onDetected({ code: data, format: type });
      cooldownRef.current = setTimeout(() => {
        lockedRef.current = false;
      }, RESCAN_COOLDOWN_MS);
    },
    [onDetected],
  );

  function handleClose() {
    if (cooldownRef.current) clearTimeout(cooldownRef.current);
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
      {/* `Modal` nativo: ventana propia, no anidada en el `Slot` de `AdaptiveShell` — necesita su
          propio safe area (notch arriba, gesture bar abajo), igual que `ProductPhotoCapture`, y su
          propio `KeyboardAvoidingView`: el `windowSoftInputMode="adjustResize"` de la Activity no
          llega acá (mismo motivo que en `components/Modal.tsx`), así que sin esto el teclado tapaba
          los botones del formulario manual ("Buscar" / "Volver a la cámara"). */}
      <KeyboardAvoidingView style={styles.avoider} behavior="height">
        <SafeAreaView
          style={[styles.container, { backgroundColor: colors.background }]}
          edges={["top", "bottom"]}
        >
          <View style={styles.header}>
            <Text style={[typography.title, { color: colors.foreground }]}>Escanear producto</Text>
            <Pressable onPress={handleClose} accessibilityRole="button" testID="scanner-close">
              <Text style={{ color: colors.primary }}>Cerrar</Text>
            </Pressable>
          </View>

          {displayedFeedback && (
            <Animated.View
              testID="scanner-feedback"
              pointerEvents="none"
              style={[
                styles.feedbackBanner,
                {
                  opacity: feedbackOpacity,
                  borderLeftColor:
                    displayedFeedback.type === "success" ? colors.success : colors.danger,
                },
              ]}
            >
              <Text
                style={[
                  styles.feedbackText1,
                  { color: displayedFeedback.type === "success" ? colors.success : colors.danger },
                ]}
              >
                {displayedFeedback.text1}
              </Text>
              {displayedFeedback.text2 && (
                <Text style={styles.feedbackText2}>{displayedFeedback.text2}</Text>
              )}
            </Animated.View>
          )}

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
        </SafeAreaView>
      </KeyboardAvoidingView>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  avoider: { flex: 1 },
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
  feedbackBanner: {
    position: "absolute",
    top: 70,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 10,
    backgroundColor: "#FFFFFF",
    borderLeftWidth: 4,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  feedbackText1: { ...typography.bodyStrong },
  feedbackText2: { ...typography.caption, color: "#111827" },
});
