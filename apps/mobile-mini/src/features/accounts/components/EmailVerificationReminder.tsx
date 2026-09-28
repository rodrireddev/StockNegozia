import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { emailVerificationConfirmSchema } from "@stocknegozia/validation";
import { useAccount } from "@/accounts/AccountContext";
import { confirmEmail, resendVerificationEmail } from "@/accounts/api/accounts.api";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { TextField } from "@/components/TextField";
import { spacing, typography } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";

/** Nunca bloquea nada (doc §3) — es solo un recordatorio liviano, se puede ignorar indefinidamente. */
export function EmailVerificationReminder() {
  const { colors } = useTheme();
  const { refetchMe } = useAccount();
  const [token, setToken] = useState("");
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleResend() {
    setError(null);
    setSubmitting(true);
    try {
      await resendVerificationEmail();
      setInfo("Te mandamos un código nuevo — revisá tu correo.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reenviar");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirm() {
    const parsed = emailVerificationConfirmSchema.safeParse({ token });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Código inválido");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await confirmEmail(parsed.data);
      await refetchMe();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo confirmar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card style={styles.card}>
      <Text style={[typography.bodyStrong, { color: colors.foreground }]}>Confirmá tu email</Text>
      <Text style={[typography.caption, { color: colors.mutedForeground }]}>
        Es opcional, pero nos ayuda a que no pierdas el acceso a tu cuenta. Revisá también la
        carpeta de spam o promociones — a veces el mail llega ahí.
      </Text>
      {info ? <Text style={[typography.caption, { color: colors.mutedForeground }]}>{info}</Text> : null}
      <TextField label="Código recibido por mail" value={token} onChangeText={setToken} autoCapitalize="none" />
      {error ? <Text style={[typography.caption, { color: colors.danger }]}>{error}</Text> : null}
      <View style={styles.actions}>
        <Button label="Reenviar código" variant="ghost" onPress={handleResend} disabled={submitting} />
        <Button label="Confirmar" onPress={handleConfirm} loading={submitting} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.xs, marginBottom: spacing.md },
  actions: { flexDirection: "row", gap: spacing.sm, justifyContent: "flex-end", marginTop: spacing.sm },
});
