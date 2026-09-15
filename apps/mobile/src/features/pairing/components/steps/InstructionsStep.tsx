import { StyleSheet, Text, View } from "react-native";
import { QrCode } from "lucide-react-native";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { WizardHeader } from "../WizardHeader";
import { useTheme } from "@/theme/useTheme";
import { spacing, typography } from "@/theme/tokens";

export function InstructionsStep({ onNext }: { onNext: () => void }) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <WizardHeader title="Emparejar dispositivo" step={1} totalSteps={5} />
      <View style={styles.iconRow}>
        <QrCode color={colors.primary} size={40} />
      </View>
      <Card style={styles.card}>
        <Text style={[styles.step, { color: colors.foreground }]}>
          1. En la computadora, abrí StockNegozia Desktop.
        </Text>
        <Text style={[styles.step, { color: colors.foreground }]}>
          2. Andá a <Text style={styles.bold}>Dispositivos</Text> →{" "}
          <Text style={styles.bold}>Emparejar dispositivo</Text>.
        </Text>
        <Text style={[styles.step, { color: colors.foreground }]}>
          3. Vas a ver un código QR y un código de verificación de 6 dígitos en pantalla.
        </Text>
        <Text style={[styles.step, { color: colors.foreground }]}>
          4. Tené el teléfono a mano para escanear ese QR con la cámara en el siguiente paso.
        </Text>
      </Card>
      <Button label="Continuar" onPress={onNext} testID="instructions-next" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: spacing.lg },
  iconRow: { alignItems: "center" },
  card: { gap: spacing.md },
  step: { ...typography.body },
  bold: { fontWeight: "700" },
});
