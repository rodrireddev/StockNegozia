import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { passwordResetConfirmSchema, passwordResetRequestSchema } from "@stocknegozia/validation";
import { useAccount } from "@/accounts/AccountContext";
import { requestPasswordReset } from "@/accounts/api/accounts.api";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { spacing, typography } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";

/**
 * Sin deep link todavía (doc: proveedor de email real es una decisión pendiente) — el código
 * llega por mail como texto, la persona lo pega a mano en el segundo paso. Cuando haya un
 * proveedor real y deep linking configurado, este segundo paso puede saltarse solo.
 */
export function ForgotPasswordForm({ onDone }: { onDone: () => void }) {
  const { colors } = useTheme();
  const { completePasswordReset } = useAccount();
  const [step, setStep] = useState<"request" | "confirm">("request");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleRequest() {
    const parsed = passwordResetRequestSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Email inválido");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const result = await requestPasswordReset(parsed.data);
      setInfo("Si el email existe, te mandamos un código. Revisá tu correo.");
      if (result.devToken) setToken(result.devToken); // dev: sin proveedor de email real todavía
      setStep("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo pedir el reset");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirm() {
    const parsed = passwordResetConfirmSchema.safeParse({ token, newPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await completePasswordReset(parsed.data);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar la contraseña");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "request") {
    return (
      <View style={styles.form}>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        {error ? <Text style={[typography.caption, { color: colors.danger }]}>{error}</Text> : null}
        <Button label="Mandar código" onPress={handleRequest} loading={submitting} />
        <Button label="Volver" variant="ghost" onPress={onDone} disabled={submitting} />
      </View>
    );
  }

  return (
    <View style={styles.form}>
      {info ? <Text style={[typography.caption, { color: colors.mutedForeground }]}>{info}</Text> : null}
      <TextField label="Código recibido por mail" value={token} onChangeText={setToken} autoCapitalize="none" />
      <TextField label="Contraseña nueva" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
      {error ? <Text style={[typography.caption, { color: colors.danger }]}>{error}</Text> : null}
      <Button label="Cambiar contraseña" onPress={handleConfirm} loading={submitting} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.sm },
});
