import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  Banknote,
  CreditCard,
  Landmark,
  Plus,
  QrCode,
  Split,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react-native";
import {
  CARD_BRANDS,
  MAX_SALE_PAYMENTS,
  PAYMENT_METHODS,
  type CardBrand,
  type PaymentMethod,
  type PaymentTermsDto,
} from "@stocknegozia/api-contracts";
import {
  CARD_BRAND_LABELS,
  changePaymentLineMethod,
  creditInstallmentOptions,
  DEFAULT_PAYMENT_TERMS,
  formatPercent,
  resolvePlanTerms,
  type PaymentCharges,
  createPaymentLine,
  disableSplitPayment,
  enableSplitPayment,
  fillRemaining,
  formatMoney,
  installmentAmount,
  isCardPayment,
  parseMoneyInput,
  PAYMENT_METHOD_SHORT_LABELS,
  paymentReferenceLabel,
  type PaymentDraft,
  type PaymentDraftLine,
  type PaymentDraftSummary,
} from "@stocknegozia/shared";
import { Checkbox } from "@/components/Checkbox";
import { MoneyField } from "@/components/MoneyField";
import { Select } from "@/components/Select";
import { TextField } from "@/components/TextField";
import { useTheme } from "@/theme/useTheme";
import { minTouchTarget, radius, spacing, typography } from "@/theme/tokens";

const METHOD_ICONS: Record<PaymentMethod, LucideIcon> = {
  cash: Banknote,
  debit_card: CreditCard,
  credit_card: CreditCard,
  transfer: Landmark,
  qr: QrCode,
  other: Wallet,
};

const NO_BRAND = "none";

interface PaymentSectionProps {
  total: number;
  draft: PaymentDraft;
  onChange: (draft: PaymentDraft) => void;
  summary: PaymentDraftSummary;
  /** Condiciones de cobro configuradas — planes de cuotas, recargos y acreditación. */
  terms?: PaymentTermsDto;
}

/**
 * "¿Cómo paga?" de la venta — medio de pago con sus datos propios (vuelto en efectivo, cuotas y
 * marca en tarjeta, n° de operación en transferencia/QR) y pago mixto. Las reglas viven en
 * `@stocknegozia/shared` (`summarizePaymentDraft`), igual que en Desktop. Mismo componente en
 * `apps/mobile`.
 */
export function PaymentSection({
  total,
  draft,
  onChange,
  summary,
  terms = DEFAULT_PAYMENT_TERMS,
}: PaymentSectionProps) {
  const { colors } = useTheme();
  const single = !draft.split;
  // "Pagos completos" sólo cuando realmente se puede confirmar: una línea con el monto vacío deja
  // `remaining` en 0 pero igual tiene error ("Completá el monto del pago 2").
  const splitStatus = {
    ok: summary.error === null,
    text:
      summary.remaining > 0.005
        ? `Falta: ${formatMoney(summary.remaining)}`
        : summary.remaining < -0.005
          ? `Sobra: ${formatMoney(-summary.remaining)}`
          : summary.error === null
            ? "Pagos completos"
            : "Completá los montos",
  };
  const firstLine = draft.lines[0];

  function updateLine(key: string, update: (line: PaymentDraftLine) => PaymentDraftLine) {
    onChange({
      ...draft,
      lines: draft.lines.map((line) => (line.key === key ? update(line) : line)),
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[typography.label, { color: colors.foreground }]}>Forma de pago</Text>
        <Pressable
          testID="toggle-split-payment"
          accessibilityRole="button"
          onPress={() =>
            onChange(single ? enableSplitPayment(draft, total) : disableSplitPayment(draft))
          }
          style={styles.linkButton}
          hitSlop={8}
        >
          <Split size={14} color={colors.primary} />
          <Text style={[typography.caption, { color: colors.primary }]}>
            {single ? "Dividir pago" : "Un solo pago"}
          </Text>
        </Pressable>
      </View>

      {single && firstLine ? (
        <>
          <MethodPicker
            value={firstLine.method}
            onChange={(method) =>
              updateLine(firstLine.key, (line) => changePaymentLineMethod(line, method))
            }
          />
          <LineDetails
            line={firstLine}
            amount={total}
            change={summary.change}
            terms={terms}
            charges={summary.lineCharges[firstLine.key]}
            onChange={(update) => updateLine(firstLine.key, update)}
          />
        </>
      ) : (
        <View style={styles.container}>
          {draft.lines.map((line, index) => (
            <View key={line.key} style={[styles.lineCard, { borderColor: colors.border }]}>
              <View style={styles.headerRow}>
                <Text style={[typography.caption, { color: colors.mutedForeground }]}>
                  Pago {index + 1}
                </Text>
                {draft.lines.length > 2 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Quitar pago ${index + 1}`}
                    hitSlop={8}
                    onPress={() =>
                      onChange({
                        ...draft,
                        lines: draft.lines.filter((other) => other.key !== line.key),
                      })
                    }
                  >
                    <X size={18} color={colors.mutedForeground} />
                  </Pressable>
                ) : null}
              </View>
              <Select
                label="Medio"
                value={line.method}
                options={PAYMENT_METHODS.map((method) => ({
                  value: method,
                  label: PAYMENT_METHOD_SHORT_LABELS[method],
                }))}
                onChange={(method) =>
                  updateLine(line.key, (current) => changePaymentLineMethod(current, method))
                }
              />
              <View style={styles.amountRow}>
                <View style={styles.flex}>
                  <MoneyField
                    label="Monto"
                    testID={`payment-amount-${index + 1}`}
                    value={line.amountText}
                    onChangeText={(amountText) =>
                      updateLine(line.key, (current) => ({ ...current, amountText }))
                    }
                  />
                </View>
                <Pressable
                  testID={`payment-fill-remaining-${index + 1}`}
                  accessibilityRole="button"
                  onPress={() => onChange(fillRemaining(draft, line.key, total))}
                  style={[styles.restButton, { borderColor: colors.border }]}
                >
                  <Text style={[typography.label, { color: colors.foreground }]}>Resto</Text>
                </Pressable>
              </View>
              <LineDetails
                line={line}
                amount={parseMoneyInput(line.amountText) ?? 0}
                change={null}
                terms={terms}
                charges={summary.lineCharges[line.key]}
                onChange={(update) => updateLine(line.key, update)}
              />
            </View>
          ))}
          <View style={styles.headerRow}>
            {draft.lines.length < MAX_SALE_PAYMENTS ? (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  onChange({ ...draft, lines: [...draft.lines, createPaymentLine("cash")] })
                }
                style={styles.linkButton}
                hitSlop={8}
              >
                <Plus size={14} color={colors.primary} />
                <Text style={[typography.caption, { color: colors.primary }]}>Agregar pago</Text>
              </Pressable>
            ) : (
              <View />
            )}
            <Text
              style={[
                typography.caption,
                { color: splitStatus.ok ? colors.success : colors.warning },
              ]}
            >
              {splitStatus.text}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

function MethodPicker({
  value,
  onChange,
}: {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.methodGrid} accessibilityRole="radiogroup">
      {PAYMENT_METHODS.map((method) => {
        const Icon = METHOD_ICONS[method];
        const selected = method === value;
        const foreground = selected ? colors.primaryForeground : colors.foreground;
        return (
          <Pressable
            key={method}
            testID={`payment-method-${method}`}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={PAYMENT_METHOD_SHORT_LABELS[method]}
            onPress={() => onChange(method)}
            style={[
              styles.methodChip,
              {
                borderColor: selected ? colors.primary : colors.border,
                backgroundColor: selected ? colors.primary : colors.background,
              },
            ]}
          >
            <Icon size={18} color={foreground} />
            <Text style={[typography.caption, { color: foreground }]} numberOfLines={1}>
              {PAYMENT_METHOD_SHORT_LABELS[method]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function LineDetails({
  line,
  amount,
  change,
  terms,
  charges,
  onChange,
}: {
  line: PaymentDraftLine;
  amount: number;
  change: number | null;
  terms: PaymentTermsDto;
  charges: PaymentCharges | undefined;
  onChange: (update: (line: PaymentDraftLine) => PaymentDraftLine) => void;
}) {
  const { colors } = useTheme();
  const referenceLabel = paymentReferenceLabel(line.method);

  return (
    <View style={styles.container}>
      {line.method === "cash" ? (
        <>
          <MoneyField
            label="Paga con (opcional)"
            testID="payment-received"
            value={line.receivedText}
            placeholder={amount > 0 ? formatMoney(amount).replace(/^\$\s?/, "") : "0"}
            onChangeText={(receivedText) => onChange((current) => ({ ...current, receivedText }))}
          />
          {change !== null ? (
            <View style={styles.headerRow}>
              <Text style={[typography.bodyStrong, { color: colors.foreground }]}>Vuelto</Text>
              <Text
                style={[typography.bodyStrong, styles.amountText, { color: colors.success }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatMoney(change)}
              </Text>
            </View>
          ) : null}
        </>
      ) : null}

      {line.method === "credit_card" ? (
        <View style={styles.container}>
          <Text style={[typography.label, { color: colors.mutedForeground }]}>Cuotas</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {creditInstallmentOptions(terms).map((option) => {
              const selected = line.installments === option;
              const surcharge =
                resolvePlanTerms(terms, "credit_card", option)?.surchargePercent ?? 0;
              return (
                <Pressable
                  key={option}
                  testID={`installments-${option}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => onChange((current) => ({ ...current, installments: option }))}
                  style={[
                    styles.smallChip,
                    {
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? colors.primary : colors.background,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.caption,
                      { color: selected ? colors.primaryForeground : colors.foreground },
                    ]}
                  >
                    {option === 1 ? "1 pago" : `${option}`}
                    {surcharge > 0 ? ` +${formatPercent(surcharge)}` : ""}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {line.installments > 1 && amount > 0 ? (
            <Text style={[typography.caption, { color: colors.mutedForeground }]}>
              {line.installments} cuotas de{" "}
              {formatMoney(installmentAmount(charges?.chargedAmount ?? amount, line.installments))}
            </Text>
          ) : null}
        </View>
      ) : null}

      {isCardPayment(line.method) ? (
        <Select<CardBrand | typeof NO_BRAND>
          label="Marca (opcional)"
          value={line.cardBrand ?? NO_BRAND}
          options={[
            { value: NO_BRAND, label: "Sin especificar" },
            ...CARD_BRANDS.map((brand) => ({ value: brand, label: CARD_BRAND_LABELS[brand] })),
          ]}
          onChange={(brand) =>
            onChange((current) => ({ ...current, cardBrand: brand === NO_BRAND ? null : brand }))
          }
        />
      ) : null}

      {line.method !== "cash" && line.method !== "other" ? (
        <SurchargeInfo line={line} terms={terms} charges={charges} onChange={onChange} />
      ) : null}

      {referenceLabel ? (
        <TextField
          label={`${referenceLabel} (opcional)`}
          testID="payment-reference"
          value={line.reference}
          maxLength={60}
          onChangeText={(reference) => onChange((current) => ({ ...current, reference }))}
        />
      ) : null}
    </View>
  );
}

const settlementFormatter = new Intl.DateTimeFormat("es-AR", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

/** Recargo al cliente (con opción de bonificarlo) y cuándo se acredita — según Ajustes → Medios
 *  de pago. */
function SurchargeInfo({
  line,
  terms,
  charges,
  onChange,
}: {
  line: PaymentDraftLine;
  terms: PaymentTermsDto;
  charges: PaymentCharges | undefined;
  onChange: (update: (line: PaymentDraftLine) => PaymentDraftLine) => void;
}) {
  const { colors } = useTheme();
  const plan = resolvePlanTerms(terms, line.method, line.installments);
  const hasSurcharge = (plan?.surchargePercent ?? 0) > 0;
  const settlementDate = (plan?.settlementDays ?? 0) > 0 ? charges?.settlementDate : null;
  if (!hasSurcharge && !settlementDate) return null;

  return (
    <View style={[styles.infoBox, { backgroundColor: colors.muted }]}>
      {hasSurcharge ? (
        <>
          <Text
            style={[
              typography.caption,
              {
                color: line.waiveSurcharge ? colors.mutedForeground : colors.foreground,
                textDecorationLine: line.waiveSurcharge ? "line-through" : "none",
              },
            ]}
          >
            Recargo {formatPercent(plan?.surchargePercent ?? 0)}
            {charges && !line.waiveSurcharge ? `: ${formatMoney(charges.surchargeAmount)}` : ""}
          </Text>
          <Checkbox
            checked={line.waiveSurcharge}
            onChange={(waiveSurcharge) => onChange((current) => ({ ...current, waiveSurcharge }))}
            label="Bonificar recargo"
            testID="waive-surcharge"
          />
        </>
      ) : null}
      {settlementDate ? (
        <Text style={[typography.caption, { color: colors.mutedForeground }]}>
          Se acredita el {settlementFormatter.format(settlementDate)}
          {charges && charges.feeAmount > 0
            ? ` · comisión estimada ${formatMoney(charges.feeAmount)}`
            : ""}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  infoBox: { gap: spacing.xs, padding: spacing.sm, borderRadius: radius.md },
  container: { gap: spacing.sm },
  flex: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  linkButton: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  methodGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  methodChip: {
    flexBasis: "30%",
    flexGrow: 1,
    minHeight: minTouchTarget,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
  },
  chipsRow: { gap: spacing.sm },
  smallChip: {
    minWidth: 44,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.full,
  },
  lineCard: {
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  amountRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
  restButton: {
    minHeight: minTouchTarget,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
  },
  amountText: { flexShrink: 1, textAlign: "right" },
});
