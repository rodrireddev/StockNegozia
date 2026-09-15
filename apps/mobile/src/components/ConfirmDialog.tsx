import { StyleSheet, Text, View } from "react-native";
import { Button, type ButtonVariant } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { useTheme } from "@/theme/useTheme";
import { spacing, typography } from "@/theme/tokens";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  isPending?: boolean;
  variant?: Extract<ButtonVariant, "primary" | "danger">;
}

/** Mismo rol que el `ConfirmDialog` de Desktop — confirmación de una acción reversible (activar/
 *  desactivar un producto), no un borrado permanente (Desktop tampoco tiene borrado permanente). */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  isPending,
  variant = "primary",
}: ConfirmDialogProps) {
  const { colors } = useTheme();

  return (
    <Modal visible={open} onClose={() => onOpenChange(false)}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.description, { color: colors.mutedForeground }]}>{description}</Text>
        <View style={styles.actions}>
          <View style={styles.action}>
            <Button
              label="Cancelar"
              variant="ghost"
              onPress={() => onOpenChange(false)}
              disabled={isPending}
            />
          </View>
          <View style={styles.action}>
            <Button
              label={confirmLabel}
              variant={variant}
              onPress={onConfirm}
              loading={isPending}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  title: { ...typography.subtitle },
  description: { ...typography.body },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  action: { flex: 1 },
});
