import type { ReactNode } from "react";
import { Modal as RNModal, Pressable, StyleSheet } from "react-native";
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
 * contenido.
 */
export function Modal({ visible, onClose, children }: ModalProps) {
  const { colors } = useTheme();

  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="none">
        <Pressable
          style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}
          onPress={(event) => event.stopPropagation()}
        >
          {children}
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

const styles = StyleSheet.create({
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
