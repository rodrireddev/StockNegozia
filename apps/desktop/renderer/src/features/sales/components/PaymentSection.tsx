import type { CardBrand, PaymentMethod, PaymentTermsDto } from "@stocknegozia/api-contracts";
import { CARD_BRANDS, MAX_SALE_PAYMENTS } from "@stocknegozia/api-contracts";
import {
  availablePaymentMethods,
  CARD_BRAND_LABELS,
  creditInstallmentOptions,
  DEFAULT_PAYMENT_TERMS,
  formatPercent,
  resolvePlanTerms,
  type PaymentCharges,
  changePaymentLineMethod,
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
import {
  Banknote,
  BookUser,
  CreditCard,
  Landmark,
  Plus,
  QrCode,
  Split,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const METHOD_ICONS: Record<PaymentMethod, typeof Banknote> = {
  cash: Banknote,
  debit_card: CreditCard,
  credit_card: CreditCard,
  transfer: Landmark,
  qr: QrCode,
  other: Wallet,
  account: BookUser,
};

interface PaymentSectionProps {
  total: number;
  draft: PaymentDraft;
  onChange: (draft: PaymentDraft) => void;
  summary: PaymentDraftSummary;
  /** Condiciones de cobro configuradas — planes de cuotas, recargos y acreditación. */
  terms?: PaymentTermsDto;
  disabled?: boolean;
  /** Ofrecer "Cuenta corriente" — sólo cuando la venta tiene un cliente elegido. */
  allowAccount?: boolean;
}

/**
 * "¿Cómo paga?" de la venta: medio de pago (efectivo, débito, crédito, transferencia, QR, otro),
 * con los datos propios de cada uno — "paga con" + vuelto en efectivo, cuotas y marca en tarjeta,
 * n° de operación en transferencia — y pago mixto ("dividir pago") para cobrar parte en efectivo y
 * parte con tarjeta. Las reglas viven en `@stocknegozia/shared` (`summarizePaymentDraft`), igual
 * que en Mobile y Mobile Mini.
 */
export function PaymentSection({
  total,
  draft,
  onChange,
  summary,
  terms = DEFAULT_PAYMENT_TERMS,
  disabled,
  allowAccount = false,
}: PaymentSectionProps) {
  const methods = availablePaymentMethods(allowAccount);
  function updateLine(key: string, update: (line: PaymentDraftLine) => PaymentDraftLine) {
    onChange({
      ...draft,
      lines: draft.lines.map((line) => (line.key === key ? update(line) : line)),
    });
  }

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

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Forma de pago</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          disabled={disabled}
          onClick={() =>
            onChange(single ? enableSplitPayment(draft, total) : disableSplitPayment(draft))
          }
        >
          <Split className="mr-1 h-3.5 w-3.5" />
          {single ? "Dividir pago" : "Un solo pago"}
        </Button>
      </div>

      {single && firstLine ? (
        <>
          <MethodPicker
            methods={methods}
            value={firstLine.method}
            disabled={disabled}
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
            disabled={disabled}
            onChange={(update) => updateLine(firstLine.key, update)}
          />
        </>
      ) : (
        <div className="space-y-2">
          {draft.lines.map((line, index) => (
            <div key={line.key} className="space-y-2 rounded-md border border-border p-2">
              <div className="flex items-center gap-2">
                <Select
                  aria-label={`Medio del pago ${index + 1}`}
                  value={line.method}
                  disabled={disabled}
                  className="h-8 flex-1"
                  onChange={(event) =>
                    updateLine(line.key, (current) =>
                      changePaymentLineMethod(current, event.target.value as PaymentMethod),
                    )
                  }
                >
                  {methods.map((method) => (
                    <option key={method} value={method}>
                      {PAYMENT_METHOD_SHORT_LABELS[method]}
                    </option>
                  ))}
                </Select>
                {draft.lines.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    disabled={disabled}
                    aria-label={`Quitar pago ${index + 1}`}
                    onClick={() =>
                      onChange({
                        ...draft,
                        lines: draft.lines.filter((other) => other.key !== line.key),
                      })
                    }
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <MoneyInput
                  aria-label={`Monto del pago ${index + 1}`}
                  value={line.amountText}
                  disabled={disabled}
                  className="h-8"
                  onValueChange={(amountText) =>
                    updateLine(line.key, (current) => ({ ...current, amountText }))
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0"
                  disabled={disabled}
                  onClick={() => onChange(fillRemaining(draft, line.key, total))}
                >
                  Resto
                </Button>
              </div>
              <LineDetails
                line={line}
                amount={parseMoneyInput(line.amountText) ?? 0}
                change={null}
                terms={terms}
                charges={summary.lineCharges[line.key]}
                disabled={disabled}
                onChange={(update) => updateLine(line.key, update)}
              />
            </div>
          ))}
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7"
              disabled={disabled || draft.lines.length >= MAX_SALE_PAYMENTS}
              onClick={() =>
                onChange({ ...draft, lines: [...draft.lines, createPaymentLine("cash")] })
              }
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Agregar pago
            </Button>
            <span
              className={cn(
                "text-right text-xs tabular-nums",
                splitStatus.ok ? "text-success" : "text-warning",
              )}
            >
              {splitStatus.text}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function MethodPicker({
  methods,
  value,
  onChange,
  disabled,
}: {
  methods: PaymentMethod[];
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Medio de pago">
      {methods.map((method) => {
        const Icon = METHOD_ICONS[method];
        const selected = method === value;
        return (
          <button
            key={method}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(method)}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-md border px-1 py-1.5 text-xs transition-colors disabled:opacity-50",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-accent",
            )}
          >
            <Icon className="h-4 w-4" />
            {PAYMENT_METHOD_SHORT_LABELS[method]}
          </button>
        );
      })}
    </div>
  );
}

function LineDetails({
  line,
  amount,
  change,
  terms,
  charges,
  onChange,
  disabled,
}: {
  line: PaymentDraftLine;
  terms: PaymentTermsDto;
  /** Recargo/comisión/acreditación estimados para esta línea. */
  charges: PaymentCharges | undefined;
  /** Monto que cubre esta línea — para "cuotas de $ X" y para el placeholder de "Paga con". */
  amount: number;
  /** Vuelto ya calculado (sólo un único pago en efectivo). */
  change: number | null;
  onChange: (update: (line: PaymentDraftLine) => PaymentDraftLine) => void;
  disabled?: boolean;
}) {
  const referenceLabel = paymentReferenceLabel(line.method);

  return (
    <div className="space-y-2">
      {line.method === "cash" && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-xs text-muted-foreground">Paga con</span>
            <MoneyInput
              aria-label="Monto recibido en efectivo"
              value={line.receivedText}
              placeholder={amount > 0 ? formatMoney(amount).replace(/^\$\s?/, "") : "0"}
              disabled={disabled}
              className="h-8"
              onValueChange={(receivedText) =>
                onChange((current) => ({ ...current, receivedText }))
              }
            />
          </div>
          {change !== null && (
            <p className="flex justify-between text-sm font-medium tabular-nums">
              <span>Vuelto</span>
              <span className="text-success">{formatMoney(change)}</span>
            </p>
          )}
        </div>
      )}

      {isCardPayment(line.method) && (
        <div className="flex gap-2">
          {line.method === "credit_card" && (
            <Select
              aria-label="Cuotas"
              value={String(line.installments)}
              disabled={disabled}
              className="h-8 flex-1"
              onChange={(event) =>
                onChange((current) => ({ ...current, installments: Number(event.target.value) }))
              }
            >
              {creditInstallmentOptions(terms).map((option) => {
                const surcharge =
                  resolvePlanTerms(terms, "credit_card", option)?.surchargePercent ?? 0;
                return (
                  <option key={option} value={option}>
                    {option === 1 ? "1 pago" : `${option} cuotas`}
                    {surcharge > 0 ? ` (+${formatPercent(surcharge)})` : ""}
                  </option>
                );
              })}
            </Select>
          )}
          <Select
            aria-label="Marca de la tarjeta"
            value={line.cardBrand ?? ""}
            disabled={disabled}
            className="h-8 flex-1"
            onChange={(event) =>
              onChange((current) => ({
                ...current,
                cardBrand: (event.target.value || null) as CardBrand | null,
              }))
            }
          >
            <option value="">Marca (opcional)</option>
            {CARD_BRANDS.map((brand) => (
              <option key={brand} value={brand}>
                {CARD_BRAND_LABELS[brand]}
              </option>
            ))}
          </Select>
        </div>
      )}

      {line.method === "credit_card" && line.installments > 1 && amount > 0 && (
        <p className="text-xs tabular-nums text-muted-foreground">
          {line.installments} cuotas de{" "}
          {formatMoney(installmentAmount(charges?.chargedAmount ?? amount, line.installments))}
        </p>
      )}

      {line.method !== "cash" && line.method !== "other" && (
        <SurchargeInfo
          line={line}
          terms={terms}
          charges={charges}
          disabled={disabled}
          onChange={onChange}
        />
      )}

      {referenceLabel && (
        <Input
          aria-label={referenceLabel}
          placeholder={`${referenceLabel} (opcional)`}
          value={line.reference}
          maxLength={60}
          disabled={disabled}
          className="h-8"
          onChange={(event) =>
            onChange((current) => ({ ...current, reference: event.target.value }))
          }
        />
      )}
    </div>
  );
}

const settlementFormatter = new Intl.DateTimeFormat("es-AR", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

/** Recargo al cliente (con opción de bonificarlo) y cuándo se acredita — según las condiciones
 *  configuradas en Configuración → Medios de pago. */
function SurchargeInfo({
  line,
  terms,
  charges,
  disabled,
  onChange,
}: {
  line: PaymentDraftLine;
  terms: PaymentTermsDto;
  charges: PaymentCharges | undefined;
  disabled?: boolean;
  onChange: (update: (line: PaymentDraftLine) => PaymentDraftLine) => void;
}) {
  const plan = resolvePlanTerms(terms, line.method, line.installments);
  const hasSurcharge = (plan?.surchargePercent ?? 0) > 0;
  const settlementDate = (plan?.settlementDays ?? 0) > 0 ? charges?.settlementDate : null;
  if (!hasSurcharge && !settlementDate) return null;

  return (
    <div className="space-y-1 rounded-md bg-muted px-2 py-1.5 text-xs">
      {hasSurcharge && (
        <div className="flex items-center justify-between gap-2">
          <span className={line.waiveSurcharge ? "text-muted-foreground line-through" : ""}>
            Recargo {formatPercent(plan?.surchargePercent ?? 0)}
            {charges && !line.waiveSurcharge && `: ${formatMoney(charges.surchargeAmount)}`}
          </span>
          <label className="flex items-center gap-1 text-muted-foreground">
            <input
              type="checkbox"
              className="h-3.5 w-3.5"
              checked={line.waiveSurcharge}
              disabled={disabled}
              onChange={(event) =>
                onChange((current) => ({ ...current, waiveSurcharge: event.target.checked }))
              }
            />
            Bonificar
          </label>
        </div>
      )}
      {settlementDate && (
        <p className="text-muted-foreground">
          Se acredita el {settlementFormatter.format(settlementDate)}
          {charges &&
            charges.feeAmount > 0 &&
            ` · comisión estimada ${formatMoney(charges.feeAmount)}`}
        </p>
      )}
    </div>
  );
}
