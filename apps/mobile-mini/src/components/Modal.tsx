import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal as RNModal, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/useTheme";
import { radius, spacing } from "@/theme/tokens";

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Hoja/tarjeta modal genérica — backdrop tocable para cerrar + contenedor con el fondo/borde del
 * tema. Base de `Select` y `ConfirmDialog`; no impone header/footer, cada consumidor arma su
 * contenido. Al ser un `Modal` nativo (ventana propia, no anidado en el `Slot` de `AdaptiveShell`),
 * es la propia hoja la que toca el borde físico inferior — necesita su propio inset, no alcanza
 * con el de la tab bar (ver `AdaptiveShell` y `ScreenContainer`).
 *
 * El `KeyboardAvoidingView` es necesario porque este `Modal` es su propia ventana nativa: el
 * `windowSoftInputMode="adjustResize"` de la Activity (ver `AndroidManifest.xml`) no reduce el
 * espacio disponible acá, así que sin esto el teclado tapaba el campo de texto en formularios como
 * `MissingBusinessNameModal` (reportado) o `StockAdjustModal`, sin forma de ver lo que se escribe.
 */
export function Modal({ visible, onClose, children }: ModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.avoider} behavior="height">
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="none">
          <Pressable
            style={[
              styles.card,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                paddingBottom: Math.max(insets.bottom, spacing.lg),
              },
            ]}
            onPress={(event) => event.stopPropagation()}
          >
            {children}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  avoider: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  card: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    maxHeight: "80%",
  },
});
