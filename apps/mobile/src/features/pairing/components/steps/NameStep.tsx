import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as Device from "expo-device";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { WizardHeader } from "../WizardHeader";
import { typography, spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";

const defaultDeviceName = Device.deviceName ?? Device.modelName ?? "";

export interface NameStepProps {
  onSubmit: (deviceName: string) => void;
  onBack: () => void;
  isPending: boolean;
  error: string | null;
}

export function NameStep({ onSubmit, onBack, isPending, error }: NameStepProps) {
  const { colors } = useTheme();
  const [deviceName, setDeviceName] = useState(defaultDeviceName);

  return (
    <View style={styles.container}>
      <WizardHeader title="Nombre del dispositivo" step={5} totalSteps={5} onBack={onBack} />
      <Text style={[styles.hint, { color: colors.mutedForeground }]}>
        Elegí un nombre para identificar este teléfono en StockNegozia (por ejemplo, el nombre de
        quien lo usa).
      </Text>
      <TextField
        label="Nombre del dispositivo"
        value={deviceName}
        onChangeText={setDeviceName}
        placeholder="Mi teléfono"
        autoFocus
        testID="device-name-input"
      />
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      <Button
        label="Emparejar"
        onPress={() => onSubmit(deviceName.trim())}
        loading={isPending}
        disabled={deviceName.trim().length === 0}
        testID="name-submit"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: spacing.lg },
  hint: { ...typography.body },
  error: { ...typography.caption },
});
