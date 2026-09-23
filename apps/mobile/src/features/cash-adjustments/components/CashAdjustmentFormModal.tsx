import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { TextField } from "@/components/TextField";
import { useTheme } from "@/theme/useTheme";
import { minTouchTarget, radius, spacing, typography } from "@/theme/tokens";
import { useCreateCashAdjustment } from "../hooks/useCreateCashAdjustment";

type Direction = "IN" | "OUT";

interface CashAdjustmentFormModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Alta de un movimiento de caja sin relación con ninguna venta — el caso de uso principal es
 * "retiro" (pagar una deuda, un sueldo), por eso arranca en `OUT`, pero también admite `IN` (un
 * aporte de capital propio) para no dejar la caja en falso cuando efectivamente entró plata por
 * fuera de una venta.
 */
export function CashAdjustmentFormModal({ visible, onClose }: CashAdjustmentFormModalProps) {
  const { colors } = useTheme();
  const [direction, setDirection] = useState<Direction>("OUT");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const createCashAdjustment = useCreateCashAdjustment();

  function reset() {
    setDirection("OUT");
    setAmount("");
    setReason("");
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSave() {
    setError(null);
    const parsedAmount = Number(amount.replace(",", "."));
    if (!amount.trim() || !(parsedAmount > 0)) {
      setError("Ingresá un monto mayor a cero");
      return;
    }
    if (!reason.trim()) {
      setError("Ingresá un motivo");
      return;
    }

    createCashAdjustment.mutate(
      { direction, amount: parsedAmount, reason: reason.trim() },
      {
        onSuccess: handleClose,
        onError: (err) => setError(err instanceof Error ? err.message : "No se pudo guardar el ajuste."),
      },
    );
  }

  return (
    <Modal visible={visible} onClose={handleClose}>
      <View style={styles.content}>
        <Text style={[typography.subtitle, { color: colors.foreground }]}>Nuevo ajuste de caja</Text>

        <View style={styles.directionToggle}>
          {(
            [
              { value: "OUT" as const, label: "Retiro" },
              { value: "IN" as const, label: "Ingreso" },
            ]
          ).map((option) => {
            const isActive = direction === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setDirection(option.value)}
                style={[
                  styles.directionOption,
                  { backgroundColor: isActive ? colors.primary : colors.secondary },
                ]}
              >
                <Text
                  style={[
                    typography.label,
                    { color: isActive ? colors.primaryForeground : colors.secondaryForeground },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <TextField
          label="Monto"
          placeholder="0"
          value={amount}
          onChangeText={(text) => {
            setAmount(text);
            setError(null);
          }}
          keyboardType="decimal-pad"
        />
        <TextField
          label="Motivo"
          placeholder={direction === "OUT" ? "Ej: Pago sueldo Juan" : "Ej: Aporte propio"}
          value={reason}
          onChangeText={(text) => {
            setReason(text);
            setError(null);
          }}
        />
        {error && <Text style={{ color: colors.danger }}>{error}</Text>}

        <View style={styles.actions}>
          <View style={styles.action}>
            <Button
              label="Cancelar"
              variant="ghost"
              onPress={handleClose}
              disabled={createCashAdjustment.isPending}
            />
          </View>
          <View style={styles.action}>
            <Button
              label={createCashAdjustment.isPending ? "Guardando…" : "Guardar"}
              onPress={handleSave}
              loading={createCashAdjustment.isPending}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  directionToggle: { flexDirection: "row", gap: spacing.sm },
  directionOption: {
    flex: 1,
    minHeight: minTouchTarget,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  action: { flex: 1 },
});
