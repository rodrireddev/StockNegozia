import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { deleteAccountSchema } from "@stocknegozia/validation";
import { useAccount } from "@/accounts/AccountContext";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { TextField } from "@/components/TextField";
import { spacing, typography } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";

/**
 * Borrado de cuenta (política de borrado de cuenta de Google Play) — irreversible: borra la
 * cuenta y todo lo asociado (créditos, racha, referidos, historial) en `apps/cloud-backend`.
 * Nunca toca lo local — productos/ventas/stock siguen en el dispositivo, la app sigue funcionando
 * igual sin cuenta (doc §3, "cuenta opcional"). Pide la contraseña de nuevo: estar logueado no
 * alcanza para una acción destructiva sobre datos reales.
 */
export function DeleteAccountModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const { deleteAccount } = useAccount();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setPassword("");
    setError(null);
    onClose();
  }

  async function handleConfirm() {
    const parsed = deleteAccountSchema.safeParse({ password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Contraseña inválida");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await deleteAccount(parsed.data.password);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar la cuenta");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} onClose={handleClose}>
      <View style={styles.content}>
        <Text style={[typography.subtitle, { color: colors.foreground }]}>Eliminar tu cuenta</Text>
        <Text style={[typography.body, { color: colors.mutedForeground }]}>
          Se borran para siempre tu saldo de créditos, racha, referidos e historial — no se puede
          deshacer. Tus productos, ventas y stock no se tocan, siguen en este dispositivo igual que
          siempre.
        </Text>
        <TextField
          label="Confirmá tu contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />
        {error ? <Text style={[typography.caption, { color: colors.danger }]}>{error}</Text> : null}
        <View style={styles.actions}>
          <View style={styles.action}>
            <Button label="Cancelar" variant="ghost" onPress={handleClose} disabled={submitting} />
          </View>
          <View style={styles.action}>
            <Button
              label="Eliminar cuenta"
              variant="danger"
              onPress={handleConfirm}
              loading={submitting}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  action: { flex: 1 },
});
