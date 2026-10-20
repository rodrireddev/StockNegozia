import { useEffect } from "react";
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import type { PaymentTermsDto } from "@stocknegozia/api-contracts";
import {
  createPaymentDraft,
  formatMoney,
  type PaymentDraft,
  type PaymentDraftSummary,
} from "@stocknegozia/shared";
import { Button } from "@/components/Button";
import { Checkbox } from "@/components/Checkbox";
import { Select } from "@/components/Select";
import { useTheme } from "@/theme/useTheme";
import { spacing, typography } from "@/theme/tokens";
import { PaymentSection } from "./PaymentSection";

interface CheckoutSheetProps {
  visible: boolean;
  onClose: () => void;
  total: number;
  itemCount: number;
  draft: PaymentDraft;
  onDraftChange: (draft: PaymentDraft) => void;
  summary: PaymentDraftSummary;
  terms?: PaymentTermsDto;
  generateReceipt: boolean;
  onGenerateReceiptChange: (value: boolean) => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  error: string | null;
  /** Clientes para elegir (opcional): sin cliente es venta de mostrador; con cliente se habilita
   *  "Cuenta corriente". Sin `customers`, no se muestra el selector. */
  customers?: { id: number; name: string }[];
  customerId?: number | null;
  onCustomerChange?: (customerId: number | null) => void;
}

const NO_CUSTOMER = "none";

/**
 * Paso "Cobrar" de la venta, en pantalla completa — como en los POS de referencia: primero se
 * arma el carrito (pantalla de Ventas, liviana) y recién al tocar "Cobrar" aparece cómo paga,
 * recargos, vuelto y recibo. Antes todo convivía en una sola pantalla y en un teléfono quedaba
 * sobrecargada. Es una capa a pantalla completa dentro de la misma ventana (no un modal nativo):
 * así el teclado de Android achica la vista como en cualquier pantalla y no tapa los campos, y
 * no se apila con otros modales. El botón "atrás" de Android la cierra. Mismo componente en `apps/mobile-mini`.
 */
export function CheckoutSheet({
  visible,
  onClose,
  total,
  itemCount,
  draft,
  onDraftChange,
  summary,
  terms,
  generateReceipt,
  onGenerateReceiptChange,
  onConfirm,
  isSubmitting,
  error,
  customers,
  customerId = null,
  onCustomerChange,
}: CheckoutSheetProps) {
  function handleCustomerChange(value: string) {
    const next = value === NO_CUSTOMER ? null : Number(value);
    onCustomerChange?.(next);
    // Sin cliente no hay cuenta corriente: si estaba elegida, se vuelve al medio por defecto.
    if (next === null && draft.lines.some((line) => line.method === "account")) {
      onDraftChange(createPaymentDraft());
    }
  }

  const { colors } = useTheme();
  const paymentError = summary.error;

  useEffect(() => {
    if (!visible) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay]} testID="checkout-sheet">
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.background }]}
        edges={["top", "bottom"]}
      >
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[typography.subtitle, styles.flex, { color: colors.foreground }]}>
              Cobrar
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Volver al carrito"
              onPress={onClose}
              hitSlop={12}
              testID="close-checkout"
            >
              <X size={22} color={colors.foreground} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.totalBlock}>
              <Text style={[typography.caption, { color: colors.mutedForeground }]}>
                {itemCount} {itemCount === 1 ? "producto" : "productos"}
              </Text>
              <Text
                style={[styles.bigTotal, { color: colors.foreground }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                testID="checkout-total"
              >
                {formatMoney(summary.totalToCharge)}
              </Text>
              {summary.surcharge > 0 ? (
                <Text style={[typography.caption, { color: colors.mutedForeground }]}>
                  {formatMoney(total)} + recargo {formatMoney(summary.surcharge)}
                </Text>
              ) : null}
            </View>

            {customers ? (
              <Select
                label="Cliente"
                value={customerId === null ? NO_CUSTOMER : String(customerId)}
                options={[
                  { value: NO_CUSTOMER, label: "Sin cliente (mostrador)" },
                  ...customers.map((customer) => ({
                    value: String(customer.id),
                    label: customer.name,
                  })),
                ]}
                onChange={handleCustomerChange}
                testID="checkout-customer"
              />
            ) : null}

            <PaymentSection
              total={total}
              draft={draft}
              onChange={onDraftChange}
              summary={summary}
              terms={terms}
              allowAccount={customerId !== null}
            />

            <Checkbox
              checked={generateReceipt}
              onChange={onGenerateReceiptChange}
              label="Generar recibo PDF"
              testID="generate-receipt"
            />
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
            {paymentError ? <Text style={{ color: colors.warning }}>{paymentError}</Text> : null}
            <Button
              testID="confirm-sale"
              label={
                isSubmitting
                  ? "Registrando venta…"
                  : `Confirmar ${formatMoney(summary.totalToCharge)}`
              }
              onPress={onConfirm}
              disabled={paymentError !== null}
              loading={isSubmitting}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { zIndex: 10, elevation: 10 },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  content: { gap: spacing.lg, padding: spacing.lg, paddingBottom: spacing.xxl },
  totalBlock: { alignItems: "center", gap: 2 },
  bigTotal: { fontSize: 34, fontWeight: "700", lineHeight: 40 },
  footer: { gap: spacing.sm, padding: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth },
});
