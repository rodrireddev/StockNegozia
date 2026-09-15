import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { WizardHeader } from "../WizardHeader";
import { typography, spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";

export interface VerifyStepProps {
  onNext: (verificationCode: string) => void;
  onBack: () => void;
}

export function VerifyStep({ onNext, onBack }: VerifyStepProps) {
  const { colors } = useTheme();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleContinue() {
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setError("El código de verificación tiene 6 dígitos.");
      return;
    }
    setError(null);
    onNext(trimmed);
  }

  return (
    <View style={styles.container}>
      <WizardHeader title="Código de verificación" step={4} totalSteps={5} onBack={onBack} />
      <Text style={[styles.hint, { color: colors.mutedForeground }]}>
        Escribí el código de 6 dígitos que se muestra junto al QR en el Desktop.
      </Text>
      <TextField
        label="Código de verificación"
        value={code}
        onChangeText={setCode}
        placeholder="123456"
        keyboardType="number-pad"
        maxLength={6}
        error={error}
        autoFocus
        testID="verification-code-input"
      />
      <Button label="Continuar" onPress={handleContinue} testID="verify-next" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: spacing.lg },
  hint: { ...typography.body },
});
