import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { CUSTOMER_PAYMENT_METHODS, type CustomerDto } from "@stocknegozia/api-contracts";
import {
  formatMoney,
  moneyToInputText,
  parseMoneyInput,
  PAYMENT_METHOD_SHORT_LABELS,
} from "@stocknegozia/shared";
import { customerPaymentSchema } from "@stocknegozia/validation";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { MoneyField } from "@/components/MoneyField";
import { Select } from "@/components/Select";
import { TextField } from "@/components/TextField";
import { useTheme } from "@/theme/useTheme";
import { spacing, typography } from "@/theme/tokens";
import { useCustomerAccount, useRegisterCustomerPayment } from "../hooks/useCustomers";

type Method = (typeof CUSTOMER_PAYMENT_METHODS)[number];
const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" });

/** Cuenta corriente: saldo, movimientos y "Registrar pago" — mismo flujo que Desktop. */
export function CustomerAccountModal({
  customer,
  onClose,
}: {
  customer: CustomerDto | null;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const account = useCustomerAccount(customer?.id ?? null);
  const registerPayment = useRegisterCustomerPayment(customer?.id ?? 0);
  const [amountText, setAmountText] = useState("");
  const [method, setMethod] = useState<Method>("cash");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const balance = account.data?.balance ?? customer?.balance ?? 0;

  useEffect(() => {
    if (!customer) return;
    setAmountText(customer.balance > 0 ? moneyToInputText(customer.balance) : "");
    setMethod("cash");
    setNote("");
    setError(null);
  }, [customer]);

  function handleRegister() {
    setError(null);
    const result = customerPaymentSchema.safeParse({
      amount: parseMoneyInput(amountText) ?? undefined,
      method,
      note,
    });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Revisá el pago");
      return;
    }
    registerPayment.mutate(result.data, {
      onSuccess: (updated) => {
        setAmountText(updated.balance > 0 ? moneyToInputText(updated.balance) : "");
        setNote("");
      },
      onError: (err) => setError(err.message),
    });
  }

  return (
    <Modal visible={customer !== null} onClose={onClose}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[typography.subtitle, { color: colors.foreground }]}>
          Cuenta corriente · {customer?.name}
        </Text>
        <Text
          style={[
            typography.bodyStrong,
            { color: balance > 0 ? colors.warning : colors.foreground },
          ]}
        >
          {balance > 0
            ? `Debe ${formatMoney(balance)}`
            : balance < 0
              ? `Saldo a favor ${formatMoney(-balance)}`
              : "No tiene deuda"}
        </Text>

        {balance > 0 ? (
          <View style={styles.form}>
            <MoneyField label="Monto" value={amountText} onChangeText={setAmountText} />
            <Select
              label="Medio"
              value={method}
              options={CUSTOMER_PAYMENT_METHODS.map((value) => ({
                value,
                label: PAYMENT_METHOD_SHORT_LABELS[value],
              }))}
              onChange={setMethod}
            />
            <TextField label="Nota (opcional)" value={note} onChangeText={setNote} />
            {error && <Text style={{ color: colors.danger }}>{error}</Text>}
            <Button
              label={registerPayment.isPending ? "Registrando…" : "Registrar pago"}
              onPress={handleRegister}
              loading={registerPayment.isPending}
            />
          </View>
        ) : null}

        {account.data?.entries.length === 0 ? (
          <Text style={[typography.caption, { color: colors.mutedForeground }]}>
            Todavía no compró a cuenta.
          </Text>
        ) : null}
        {account.data?.entries.map((entry) => (
          <View
            key={`${entry.type}-${entry.id}`}
            style={[styles.entry, { borderBottomColor: colors.border }]}
          >
            <View style={styles.flex}>
              <Text style={[typography.body, { color: colors.foreground }]}>
                {entry.type === "sale"
                  ? `Venta N° ${entry.saleId}`
                  : `Pago · ${entry.method ? PAYMENT_METHOD_SHORT_LABELS[entry.method] : ""}`}
              </Text>
              <Text style={[typography.caption, { color: colors.mutedForeground }]}>
                {dateFormatter.format(new Date(entry.createdAt))}
                {entry.note ? ` · ${entry.note}` : ""}
              </Text>
            </View>
            <Text
              style={[
                typography.bodyStrong,
                { color: entry.type === "payment" ? colors.success : colors.foreground },
              ]}
            >
              {entry.type === "payment" ? "−" : "+"}
              {formatMoney(entry.amount)}
            </Text>
          </View>
        ))}

        <Button label="Cerrar" variant="ghost" onPress={onClose} />
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm },
  form: { gap: spacing.sm },
  entry: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  flex: { flex: 1 },
});
