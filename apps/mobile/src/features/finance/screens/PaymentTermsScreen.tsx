import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { Plus, X } from "lucide-react-native";
import { MAX_CREDIT_PLANS } from "@stocknegozia/api-contracts";
import {
  formatMoney,
  newCreditPlanRow,
  paymentTermsFormToInput,
  paymentTermsToForm,
  type PaymentTermsForm,
  type PlanTermsFormRow,
} from "@stocknegozia/shared";
import { paymentTermsSchema } from "@stocknegozia/validation";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Checkbox } from "@/components/Checkbox";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { TextField } from "@/components/TextField";
import { useTheme } from "@/theme/useTheme";
import { spacing, typography } from "@/theme/tokens";
import { usePaymentTerms, useUpdatePaymentTerms } from "../hooks/usePaymentTerms";

type PlanField = "surchargePercent" | "feePercent" | "settlementDays";

/**
 * Configuración → Medios de pago: recargo al cliente, comisión del procesador y días de
 * acreditación por medio/plan de cuotas. Una tarjeta por medio, tres campos cortos cada una.
 * Las ventas ya hechas no cambian (cada pago guarda las condiciones vigentes al venderse).
 */
export function PaymentTermsScreen() {
  const { colors } = useTheme();
  const terms = usePaymentTerms();
  const update = useUpdatePaymentTerms();
  const [form, setForm] = useState<PaymentTermsForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (terms.data && !form) setForm(paymentTermsToForm(terms.data));
  }, [terms.data, form]);

  if (terms.isError)
    return <ErrorState message="No se pudieron cargar las condiciones." onRetry={terms.refetch} />;
  if (!form) return <LoadingState />;

  const change = (next: PaymentTermsForm) => {
    setForm(next);
    setSaved(false);
    setError(null);
  };

  function handleSave() {
    if (!form) return;
    const parsed = paymentTermsSchema.safeParse(paymentTermsFormToInput(form));
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisá los valores");
      return;
    }
    update.mutate(parsed.data, {
      onSuccess: (savedTerms) => {
        setForm(paymentTermsToForm(savedTerms));
        setSaved(true);
      },
      onError: (err) => setError(err instanceof Error ? err.message : "No se pudo guardar."),
    });
  }

  const renderFields = (
    row: PlanTermsFormRow,
    onChange: (row: PlanTermsFormRow) => void,
    testPrefix: string,
  ) => (
    <View style={styles.fieldsRow}>
      {(
        [
          ["surchargePercent", "Recargo %"],
          ["feePercent", "Comisión %"],
          ["settlementDays", "Días"],
        ] as [PlanField, string][]
      ).map(([field, label]) => (
        <View key={field} style={styles.field}>
          <TextField
            label={label}
            testID={`${testPrefix}-${field}`}
            keyboardType="decimal-pad"
            value={row[field]}
            onChangeText={(value) => onChange({ ...row, [field]: value })}
          />
        </View>
      ))}
    </View>
  );

  const plan = (
    title: string,
    row: PlanTermsFormRow,
    onChange: (row: PlanTermsFormRow) => void,
    testPrefix: string,
  ) => (
    <Card style={styles.card}>
      <Text style={[typography.bodyStrong, { color: colors.foreground }]}>{title}</Text>
      {renderFields(row, onChange, testPrefix)}
    </Card>
  );

  const example = form.credit.find((row) => Number(row.surchargePercent.replace(",", ".")) > 0);

  return (
    <>
      <Stack.Screen options={{ title: "Medios de pago" }} />
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.content}
      >
        <Text style={[typography.caption, { color: colors.mutedForeground }]}>
          Recargo: se le suma al cliente al cobrar. Comisión: lo que te descuenta el procesador.
          Días: lo que tarda la plata en llegar a tu cuenta. Las ventas ya hechas no cambian.
        </Text>

        {plan("Débito", form.debit, (debit) => change({ ...form, debit }), "debit")}

        {form.credit.map((row) => (
          <Card key={row.key} style={styles.card}>
            <View style={styles.planHeader}>
              <Text style={[typography.bodyStrong, styles.flex, { color: colors.foreground }]}>
                Crédito · {row.installments === "1" ? "1 pago" : `${row.installments} cuotas`}
              </Text>
              {row.installments !== "1" ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Quitar plan de ${row.installments} cuotas`}
                  hitSlop={8}
                  onPress={() =>
                    change({
                      ...form,
                      credit: form.credit.filter((other) => other.key !== row.key),
                    })
                  }
                >
                  <X size={18} color={colors.mutedForeground} />
                </Pressable>
              ) : null}
            </View>
            {row.installments !== "1" ? (
              <TextField
                label="Cuotas"
                keyboardType="number-pad"
                value={row.installments}
                onChangeText={(installments) =>
                  change({
                    ...form,
                    credit: form.credit.map((other) =>
                      other.key === row.key ? { ...other, installments } : other,
                    ),
                  })
                }
              />
            ) : null}
            {renderFields(
              row,
              (next) =>
                change({
                  ...form,
                  credit: form.credit.map((other) => (other.key === row.key ? next : other)),
                }),
              `credit-${row.installments}`,
            )}
          </Card>
        ))}

        {form.credit.length < MAX_CREDIT_PLANS ? (
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              change({ ...form, credit: [...form.credit, newCreditPlanRow(form.credit)] })
            }
            style={styles.addPlan}
            hitSlop={8}
          >
            <Plus size={16} color={colors.primary} />
            <Text style={[typography.label, { color: colors.primary }]}>
              Agregar plan de cuotas
            </Text>
          </Pressable>
        ) : null}

        {plan("QR / Billetera virtual", form.qr, (qr) => change({ ...form, qr }), "qr")}
        {plan(
          "Transferencia",
          form.transfer,
          (transfer) => change({ ...form, transfer }),
          "transfer",
        )}

        <Checkbox
          checked={form.businessDays}
          onChange={(businessDays) => change({ ...form, businessDays })}
          label="Contar sólo días hábiles (lunes a viernes)"
        />

        {example ? (
          <Text style={[typography.caption, { color: colors.mutedForeground }]}>
            Ejemplo: una venta de {formatMoney(10_000)} en {example.installments} cuotas se cobra{" "}
            {formatMoney(10_000 * (1 + Number(example.surchargePercent.replace(",", ".")) / 100))}.
          </Text>
        ) : null}

        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
        {saved ? (
          <Text style={{ color: colors.success }}>
            Condiciones guardadas. Se aplican a las próximas ventas.
          </Text>
        ) : null}

        <Button
          testID="save-payment-terms"
          label={update.isPending ? "Guardando…" : "Guardar condiciones"}
          onPress={handleSave}
          loading={update.isPending}
        />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xxl },
  card: { gap: spacing.sm },
  flex: { flex: 1 },
  planHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  fieldsRow: { flexDirection: "row", gap: spacing.sm },
  field: { flex: 1, minWidth: 0 },
  addPlan: { flexDirection: "row", alignItems: "center", gap: spacing.xs, alignSelf: "flex-start" },
});
