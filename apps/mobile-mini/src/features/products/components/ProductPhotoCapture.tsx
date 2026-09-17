import { useEffect, useRef, useState } from "react";
import {
  type LayoutChangeEvent,
  Image,
  Modal as RNModal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Button } from "@/components/Button";
import { useTheme } from "@/theme/useTheme";
import { radius, spacing, typography } from "@/theme/tokens";

/** Mismo límite que Desktop (`MAX_IMAGE_BYTES` en su `ProductForm.tsx`) — el campo `image` es un
 *  string libre (URL o data URI) sin límite de tamaño en el backend; el límite es una convención
 *  de cliente que ambas apps respetan igual, para no guardar fotos enormes en la base SQLite. */
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
/** Calidad JPEG del `takePictureAsync` — mantiene una foto de producto típica bien por debajo del
 *  límite sin agregar un paso de redimensionado/compresión aparte. */
const CAPTURE_QUALITY = 0.5;

export interface ProductPhotoCaptureProps {
  visible: boolean;
  onCaptured: (dataUri: string) => void;
  onCancel: () => void;
}

function estimateBase64Bytes(base64: string): number {
  // Cada 4 caracteres base64 codifican 3 bytes — estimación estándar sin decodificar el string.
  return Math.ceil((base64.length * 3) / 4);
}

/**
 * Captura de foto de producto para alta/edición en Mobile — mismo `expo-camera` que ya usa
 * `ProductScanner` (sin dependencia nueva), pero sin `barcodeScannerSettings`: acá se toma una
 * foto, no se decodifica un código. Devuelve un data URI base64 (`data:image/jpeg;base64,...`),
 * el mismo formato que ya produce Desktop con `FileReader.readAsDataURL()` — así el campo
 * `products.image` sigue siendo el mismo string libre de siempre, sin cambios de backend.
 */
export function ProductPhotoCapture({ visible, onCaptured, onCancel }: ProductPhotoCaptureProps) {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [preview, setPreview] = useState<{ uri: string; dataUri: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  // Se remonta la cámara en cada apertura del modal (en vez de reusar la misma instancia entre
  // aperturas) y se mide su contenedor real con `onLayout` en lugar de confiar únicamente en
  // `flex: 1` — corrige un caso reportado donde la vista previa se renderizaba a la mitad de su
  // tamaño real al editar un producto existente (nunca al crear uno nuevo): el contenedor del
  // modal puede quedar con una altura de ventana desactualizada si el teclado seguía abierto (de
  // haber estado editando otro campo del formulario) al momento de montar la cámara.
  const [cameraKey, setCameraKey] = useState(0);
  const [cameraSize, setCameraSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (visible) {
      setCameraKey((key) => key + 1);
      // Se descarta la medida anterior al reabrir — evita mostrar la cámara con un tamaño
      // heredado de la apertura previa hasta que `onLayout` mida el contenedor de nuevo.
      setCameraSize(null);
    }
  }, [visible]);

  function handleCameraWrapperLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    setCameraSize({ width, height });
  }

  function handleClose() {
    setPreview(null);
    setError(null);
    onCancel();
  }

  async function handleCapture() {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    setError(null);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: CAPTURE_QUALITY,
        base64: true,
      });
      if (!photo?.base64) {
        setError("No se pudo tomar la foto. Probá de nuevo.");
        return;
      }
      setPreview({ uri: photo.uri, dataUri: `data:image/jpeg;base64,${photo.base64}` });
    } catch {
      setError("No se pudo tomar la foto. Probá de nuevo.");
    } finally {
      setIsCapturing(false);
    }
  }

  function handleUsePhoto() {
    if (!preview) return;
    if (estimateBase64Bytes(preview.dataUri) > MAX_IMAGE_BYTES) {
      setError(
        "La imagen no puede superar los 2MB — probá de nuevo, a veces ayuda alejar un poco la cámara.",
      );
      return;
    }
    const dataUri = preview.dataUri;
    setPreview(null);
    setError(null);
    onCaptured(dataUri);
  }

  function handleRetake() {
    setPreview(null);
    setError(null);
  }

  return (
    <RNModal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[typography.title, { color: colors.foreground }]}>Foto del producto</Text>
          <Pressable onPress={handleClose} accessibilityRole="button" testID="photo-capture-close">
            <Text style={{ color: colors.primary }}>Cerrar</Text>
          </Pressable>
        </View>

        {preview ? (
          <View style={styles.previewWrapper}>
            <Image source={{ uri: preview.uri }} style={styles.previewImage} resizeMode="cover" />
            {error && <Text style={{ color: colors.danger }}>{error}</Text>}
            <View style={styles.previewActions}>
              <Button label="Usar esta foto" onPress={handleUsePhoto} testID="photo-use" />
              <Button
                label="Volver a tomar"
                variant="ghost"
                onPress={handleRetake}
                testID="photo-retake"
              />
            </View>
          </View>
        ) : !permission ? (
          <View style={styles.centerContent} />
        ) : !permission.granted ? (
          <View style={styles.centerContent}>
            <Text style={[typography.body, styles.message, { color: colors.foreground }]}>
              StockNegozia necesita acceso a la cámara para tomar la foto del producto. No se guarda
              ni se envía ningún video, solo la foto que elijas usar.
            </Text>
            <Button
              label={permission.canAskAgain ? "Permitir cámara" : "Abrir configuración"}
              onPress={requestPermission}
              testID="photo-permission-request"
            />
          </View>
        ) : (
          <>
            <View style={styles.cameraWrapper} onLayout={handleCameraWrapperLayout}>
              {cameraSize && (
                <CameraView
                  key={cameraKey}
                  ref={cameraRef}
                  style={[styles.camera, cameraSize]}
                  facing="back"
                />
              )}
            </View>
            {error && <Text style={{ color: colors.danger }}>{error}</Text>}
            <Button
              label={isCapturing ? "Tomando foto…" : "📷 Tomar foto"}
              onPress={handleCapture}
              loading={isCapturing}
              testID="photo-capture"
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
  cameraWrapper: { flex: 1, borderRadius: radius.lg, overflow: "hidden" },
  // Sin `flex: 1` a propósito — el tamaño real se lo da `cameraSize` (medido con `onLayout` sobre
  // `cameraWrapper`), no el motor de flexbox (ver el comentario en el componente).
  camera: {},
  previewWrapper: { flex: 1, gap: spacing.md },
  previewImage: { flex: 1, borderRadius: radius.lg },
  previewActions: { gap: spacing.sm },
});
