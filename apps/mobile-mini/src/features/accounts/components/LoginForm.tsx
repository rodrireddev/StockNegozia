import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { accountLoginSchema } from "@stocknegozia/validation";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { useAccount } from "@/accounts/AccountContext";
import { useTheme } from "@/theme/useTheme";
import { spacing, typography } from "@/theme/tokens";

export function LoginForm({ onSwitchToRegister }: { onSwitchToRegister: () => void }) {
  const { colors } = useTheme();
  const { login } = useAccount();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const parsed = accountLoginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await login(parsed.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
    } finally {
      setSubmitting(false);
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
      {error ? <Text style={[typography.caption, { color: colors.danger }]}>{error}</Text> : null}
      <Button label="Ingresar" onPress={handleSubmit} loading={submitting} />
      <Button label="Crear cuenta" variant="ghost" onPress={onSwitchToRegister} disabled={submitting} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.sm },
});
