import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { ProductDto } from "@stocknegozia/api-contracts";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { TextField } from "@/components/TextField";
import { useTheme } from "@/theme/useTheme";
import { spacing, typography } from "@/theme/tokens";
import { useAdjustStock } from "../hooks/useAdjustStock";

interface StockAdjustModalProps {
  product: ProductDto | null;
  onClose: () => void;
}

/**
 * Recibe el stock ABSOLUTO deseado y un motivo obligatorio — el backend calcula el delta y genera
 * el stock_movement correspondiente (`POST /products/:id/stock-adjustments`), mismo contrato que
 * el `StockAdjustDialog` de Desktop. Esta UI nunca calcula ni envía un delta.
 */
export function StockAdjustModal({ product, onClose }: StockAdjustModalProps) {
  const [value, setValue] = useState("0");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { colors } = useTheme();
  const adjustStock = useAdjustStock();

  useEffect(() => {
    if (product) {
      setValue(String(product.stock));
      setReason("");
      setError(null);
    }
  }, [product]);

  function handleConfirm() {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) {
      setError("Ingresá un número entero mayor o igual a 0");
      return;
    }
    if (!reason.trim()) {
      setError("Ingresá un motivo para el ajuste");
      return;
    }
    if (!product) return;
    adjustStock.mutate(
      { id: product.id, stock: parsed, reason: reason.trim(), previousStock: product.stock },
      { onSuccess: onClose, onError: (err) => setError(err.message) },
    );
  }

  return (
    <Modal visible={product !== null} onClose={onClose}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]}>Ajustar stock</Text>
        {product && (
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {product.name} (SKU {product.sku})
          </Text>
        )}
        <TextField
          label="Nuevo stock"
          value={value}
          onChangeText={setValue}
          keyboardType="number-pad"
        />
        <TextField
          label="Motivo"
          value={reason}
          onChangeText={setReason}
          placeholder="Ej: Conteo físico, mercadería dañada…"
          multiline
        />
        {error && <Text style={{ color: colors.danger }}>{error}</Text>}
        <View style={styles.actions}>
          <View style={styles.action}>
            <Button
              label="Cancelar"
              variant="ghost"
              onPress={onClose}
              disabled={adjustStock.isPending}
            />
          </View>
          <View style={styles.action}>
            <Button label="Guardar" onPress={handleConfirm} loading={adjustStock.isPending} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  title: { ...typography.subtitle },
  subtitle: { ...typography.caption },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  action: { flex: 1 },
});
