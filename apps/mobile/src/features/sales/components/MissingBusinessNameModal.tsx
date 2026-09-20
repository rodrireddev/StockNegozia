import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { TextField } from "@/components/TextField";
import { useTheme } from "@/theme/useTheme";
import { spacing, typography } from "@/theme/tokens";
import { useUpdateSettings } from "@/features/settings/hooks/useUpdateSettings";

interface MissingBusinessNameModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Bloquea la generación del recibo PDF hasta que el negocio tenga un nombre configurado — sin
 * esto, el backend usa "StockNegozia" como nombre genérico en el encabezado (ver
 * apps/backend/src/core/sales/sale-receipt.pdf.ts), un error que antes recién se notaba mirando el
 * PDF ya entregado. `SalesScreen.handleConfirm()` abre este modal en vez de registrar la venta
 * cuando el checkbox de recibo está tildado y falta el nombre — solo cierra el modal al guardar,
 * no reintenta la venta sola (la persona confirma de nuevo por su cuenta).
 */
export function MissingBusinessNameModal({ visible, onClose }: MissingBusinessNameModalProps) {
  const { colors } = useTheme();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const updateSettings = useUpdateSettings();

  function handleSave() {
    setError(null);
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Ingresá el nombre del negocio");
      return;
    }
    updateSettings.mutate(
      { businessName: trimmed },
      {
        onSuccess: () => {
          setValue("");
          onClose();
        },
        onError: (err) =>
          setError(err instanceof Error ? err.message : "No se pudo guardar el nombre."),
      },
    );
  }

  return (
    <Modal visible={visible} onClose={onClose}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Falta indicar el nombre del negocio
        </Text>
        <Text style={[typography.caption, { color: colors.mutedForeground }]}>
          No se puede generar el recibo sin un nombre de negocio configurado — sin esto, el recibo
          sale con un nombre genérico. Colocalo para continuar.
        </Text>
        <TextField
          label="Nombre del negocio"
          placeholder="Ej: Almacén Doña Rosa"
          value={value}
          onChangeText={(text) => {
            setValue(text);
            setError(null);
          }}
        />
        {error && <Text style={{ color: colors.danger }}>{error}</Text>}
        <View style={styles.actions}>
          <View style={styles.action}>
            <Button
              label="Cancelar"
              variant="ghost"
              onPress={onClose}
              disabled={updateSettings.isPending}
            />
          </View>
          <View style={styles.action}>
            <Button
              label={updateSettings.isPending ? "Guardando…" : "Guardar"}
              onPress={handleSave}
              loading={updateSettings.isPending}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  title: { ...typography.subtitle },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  action: { flex: 1 },
});
