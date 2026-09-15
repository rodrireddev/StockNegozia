import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Checkbox } from "@/components/Checkbox";
import { Button } from "@/components/Button";
import { WizardHeader } from "../WizardHeader";
import { useTheme } from "@/theme/useTheme";
import { spacing, typography } from "@/theme/tokens";

/**
 * StockNegozia todavía no tiene términos y condiciones legales reales — este texto es un
 * placeholder simulado para dejar el flujo de onboarding completo (instrucciones → términos →
 * escaneo → código → nombre). Reemplazar por el texto legal real antes de publicar en Google Play
 * (ver docs/mobile/MOBILE_CLIENT.md §Privacy / Data Safety).
 */
const PLACEHOLDER_TERMS = `Términos y condiciones de uso (texto de ejemplo — StockNegozia todavía no tiene un texto legal definitivo).

Al emparejar este dispositivo, entendés que:

- StockNegozia va a usar la cámara de este dispositivo únicamente para leer el código QR de emparejamiento — nunca se guardan ni se envían fotos o video.
- La credential que identifica a este dispositivo se guarda cifrada en este teléfono y nunca se comparte con nadie más.
- El administrador de esta instalación de StockNegozia puede revocar el acceso de este dispositivo en cualquier momento desde la aplicación de escritorio.
- Los datos de productos e inventario que veas acá pertenecen al negocio que administra esta instalación, no a vos ni a StockNegozia.

Este texto se va a reemplazar por los términos definitivos antes de publicar la aplicación.`;

export function TermsStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { colors } = useTheme();
  const [accepted, setAccepted] = useState(false);

  return (
    <View style={styles.container}>
      <WizardHeader title="Términos y condiciones" step={2} totalSteps={5} onBack={onBack} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.terms, { color: colors.mutedForeground }]}>{PLACEHOLDER_TERMS}</Text>
      </ScrollView>
      <Checkbox
        checked={accepted}
        onChange={setAccepted}
        label="Acepto los términos y condiciones"
        testID="terms-checkbox"
      />
      <Button label="Continuar" onPress={onNext} disabled={!accepted} testID="terms-next" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: spacing.lg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing.md },
  terms: { ...typography.body },
});
