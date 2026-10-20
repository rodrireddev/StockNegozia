import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { accountRegisterSchema } from "@stocknegozia/validation";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { useAccount } from "@/accounts/AccountContext";
import { useTheme } from "@/theme/useTheme";
import { spacing, typography } from "@/theme/tokens";

export function RegisterForm({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const { colors } = useTheme();
  const { register } = useAccount();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileNonce, setTurnstileNonce] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const parsed = accountRegisterSchema.safeParse({
      email,
      password,
      referralCode: referralCode.trim() || undefined,
      turnstileToken: turnstileToken ?? undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await register(parsed.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cuenta");
    } finally {
      setSubmitting(false);
      // El token se consume en el `siteverify` del backend en cada intento — hace falta uno nuevo
      // para el próximo submit, sea cual sea el resultado de este.
      setTurnstileToken(null);
      setTurnstileNonce((n) => n + 1);
    }
  }

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
      <TextField
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
      />
      <TextField
        label="Código de referido (opcional)"
        value={referralCode}
        onChangeText={setReferralCode}
        autoCapitalize="characters"
      />
      <TurnstileWidget resetKey={turnstileNonce} onToken={setTurnstileToken} />
      {error ? <Text style={[typography.caption, { color: colors.danger }]}>{error}</Text> : null}
      <Button label="Crear cuenta" onPress={handleSubmit} loading={submitting} />
      <Button
        label="Ya tengo cuenta"
        variant="ghost"
        onPress={onSwitchToLogin}
        disabled={submitting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.sm },
});
