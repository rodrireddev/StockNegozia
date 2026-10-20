import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { accountLoginSchema } from "@stocknegozia/validation";
import { ApiError } from "@/accounts/api/errors";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { useAccount } from "@/accounts/AccountContext";
import { useTheme } from "@/theme/useTheme";
import { spacing, typography } from "@/theme/tokens";

export function LoginForm({
  onSwitchToRegister,
  onForgotPassword,
}: {
  onSwitchToRegister: () => void;
  onForgotPassword: () => void;
}) {
  const { colors } = useTheme();
  const { login } = useAccount();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileNonce, setTurnstileNonce] = useState(0);
  // Arranca oculto — el backend solo exige captcha a partir del 5° login fallido consecutivo
  // desde esta IP, no en cada login normal (ver AccountsService.login).
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const parsed = accountLoginSchema.safeParse({
      email,
      password,
      turnstileToken: turnstileToken ?? undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await login(parsed.data);
    } catch (err) {
      if (err instanceof ApiError && err.code === "CAPTCHA_REQUIRED") setCaptchaRequired(true);
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
    } finally {
      setSubmitting(false);
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
        autoComplete="current-password"
      />
      {captchaRequired ? (
        <TurnstileWidget resetKey={turnstileNonce} onToken={setTurnstileToken} />
      ) : null}
      {error ? <Text style={[typography.caption, { color: colors.danger }]}>{error}</Text> : null}
      <Button label="Ingresar" onPress={handleSubmit} loading={submitting} />
      <Button
        label="Olvidé mi contraseña"
        variant="ghost"
        onPress={onForgotPassword}
        disabled={submitting}
      />
      <Button
        label="Crear cuenta"
        variant="ghost"
        onPress={onSwitchToRegister}
        disabled={submitting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.sm },
});
