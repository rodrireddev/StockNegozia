import type {
  CardBrand,
  PaymentMethod,
  PaymentTermsDto,
  SalePaymentDto,
} from "@stocknegozia/api-contracts";
import { formatMoney, moneyToInputText, parseMoneyInput, roundMoney } from "../money/money";
import { computePaymentCharges, formatPercent, type PaymentCharges } from "./payment-terms";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  debit_card: "Tarjeta de débito",
  credit_card: "Tarjeta de crédito",
  transfer: "Transferencia",
  qr: "QR / Billetera virtual",
  other: "Otro",
};

/** Etiquetas cortas — para chips/botones de selección y badges en listados. */
export const PAYMENT_METHOD_SHORT_LABELS: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  debit_card: "Débito",
  credit_card: "Crédito",
  transfer: "Transferencia",
  qr: "QR",
  other: "Otro",
};

export const CARD_BRAND_LABELS: Record<CardBrand, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  cabal: "Cabal",
  naranja: "Naranja X",
  maestro: "Maestro",
  other: "Otra",
};

/** Texto para "sin medio de pago" (ventas anteriores a esta funcionalidad). */
export const UNSPECIFIED_PAYMENT_LABEL = "Sin especificar";

export function isCardPayment(method: PaymentMethod): boolean {
  return method === "debit_card" || method === "credit_card";
}

/** Qué pide como "referencia" cada medio — el placeholder del campo opcional. */
export function paymentReferenceLabel(method: PaymentMethod): string | null {
  switch (method) {
    case "debit_card":
    case "credit_card":
      return "N° de cupón / lote";
    case "transfer":
    case "qr":
      return "N° de operación";
    case "other":
      return "Detalle";
    default:
      return null;
  }
}

/** Valor de cada cuota (sin interés: el recargo financiero, si existe, lo cobra el banco). */
export function installmentAmount(amount: number, installments: number): number {
  return roundMoney(amount / Math.max(1, installments));
}

/** "Crédito Visa · 3 cuotas de $ 1.000,00 · cupón 1234" — una línea por pago, para recibos y
 *  detalle de venta. */
export function describePayment(
  payment: Pick<SalePaymentDto, "method" | "amount" | "installments" | "cardBrand" | "reference"> &
    Partial<Pick<SalePaymentDto, "surchargePercent" | "surchargeAmount">>,
): string {
  const parts = [PAYMENT_METHOD_SHORT_LABELS[payment.method]];
  if (payment.cardBrand) parts[0] = `${parts[0]} ${CARD_BRAND_LABELS[payment.cardBrand]}`;
  if (payment.method === "credit_card" && payment.installments && payment.installments > 1) {
    parts.push(
      `${payment.installments} cuotas de ${formatMoney(installmentAmount(payment.amount, payment.installments))}`,
    );
  }
  if (payment.surchargeAmount && payment.surchargeAmount > 0) {
    parts.push(
      `recargo ${formatPercent(payment.surchargePercent ?? 0)} (${formatMoney(payment.surchargeAmount)})`,
    );
  }
  if (payment.reference) parts.push(`Ref. ${payment.reference}`);
  return parts.join(" · ");
}

/** "Efectivo + Crédito", o "Sin especificar" si la venta no tiene medios de pago registrados. */
export function describePaymentMethods(methods: readonly PaymentMethod[]): string {
  if (methods.length === 0) return UNSPECIFIED_PAYMENT_LABEL;
  return methods.map((method) => PAYMENT_METHOD_SHORT_LABELS[method]).join(" + ");
}

// ---------------------------------------------------------------------------------------------
// Borrador de pago — el estado del formulario "¿Cómo paga?" de las pantallas de venta. Lógica pura
// y compartida: Desktop, Mobile y Mobile Mini sólo renderizan, las reglas viven acá.
// ---------------------------------------------------------------------------------------------

export interface PaymentDraftLine {
  key: string;
  method: PaymentMethod;
  /** Texto del campo de monto (sólo se usa con pago mixto). */
  amountText: string;
  installments: number;
  cardBrand: CardBrand | null;
  reference: string;
  /** Texto del campo "Paga con" (sólo efectivo). */
  receivedText: string;
  /** No cobrar el recargo configurado para este medio/plan en esta venta. */
  waiveSurcharge: boolean;
}

export interface PaymentDraft {
  split: boolean;
  lines: PaymentDraftLine[];
}

/** Mismo shape que `SalePaymentInput` de `@stocknegozia/validation` (sin depender de zod acá). */
export interface PaymentInputPayload {
  method: PaymentMethod;
  amount?: number;
  installments?: number;
  cardBrand?: CardBrand;
  reference?: string;
  amountReceived?: number;
  waiveSurcharge?: boolean;
}

export interface PaymentDraftSummary {
  /** Suma de los montos cargados (con un único pago, siempre el total). */
  assigned: number;
  /** `total - assigned` — positivo = falta cobrar, negativo = se cargó de más. */
  remaining: number;
  /** Vuelto a entregar en efectivo, o `null` si no aplica / no se cargó "Paga con". */
  change: number | null;
  /** Primer problema que impide confirmar, o `null` si el pago está completo. */
  error: string | null;
  /** Lo que se envía en `createSale({ payments })`, o `null` si hay `error`. */
  payments: PaymentInputPayload[] | null;
  /** Recargo total al cliente según las condiciones de cobro (0 sin condiciones). */
  surcharge: number;
  /** Total a cobrarle al cliente: total de la venta + recargos. */
  totalToCharge: number;
  /** Recargo/comisión/acreditación estimados por línea (`key` de la línea). */
  lineCharges: Record<string, PaymentCharges>;
}

let lineCounter = 0;

export function createPaymentLine(
  method: PaymentMethod = "cash",
  amountText = "",
): PaymentDraftLine {
  lineCounter += 1;
  return {
    key: `payment-${Date.now()}-${lineCounter}`,
    method,
    amountText,
    installments: 1,
    cardBrand: null,
    reference: "",
    receivedText: "",
    waiveSurcharge: false,
  };
}

export function createPaymentDraft(method: PaymentMethod = "cash"): PaymentDraft {
  return { split: false, lines: [createPaymentLine(method)] };
}

/** Cambia el medio de una línea limpiando los datos que dejan de aplicar (cuotas, marca...). */
export function changePaymentLineMethod(
  line: PaymentDraftLine,
  method: PaymentMethod,
): PaymentDraftLine {
  return {
    ...line,
    method,
    installments: method === "credit_card" ? line.installments : 1,
    cardBrand: isCardPayment(method) ? line.cardBrand : null,
    receivedText: method === "cash" ? line.receivedText : "",
    reference: method === line.method ? line.reference : "",
  };
}

const CENT_TOLERANCE = 0.005;

function toPayload(line: PaymentDraftLine, amount: number | undefined): PaymentInputPayload {
  const payload: PaymentInputPayload = { method: line.method };
  if (amount !== undefined) payload.amount = amount;
  if (line.method === "credit_card") payload.installments = line.installments;
  if (isCardPayment(line.method) && line.cardBrand) payload.cardBrand = line.cardBrand;
  const reference = line.reference.trim();
  if (reference && line.method !== "cash") payload.reference = reference;
  if (line.waiveSurcharge && line.method !== "cash") payload.waiveSurcharge = true;
  return payload;
}

/**
 * Valida el borrador contra el total de la venta y arma el payload. Con `terms` (condiciones de
 * cobro configuradas) además estima el recargo al cliente, la comisión y la fecha de acreditación
 * de cada pago — misma cuenta que hace el backend al guardar (`computePaymentCharges`).
 */
export function summarizePaymentDraft(
  draft: PaymentDraft,
  total: number,
  terms?: PaymentTermsDto,
  at: Date = new Date(),
): PaymentDraftSummary {
  const base = summarizeAmounts(draft, total);
  const single = !draft.split || draft.lines.length === 1;
  const lineCharges: Record<string, PaymentCharges> = {};
  let surcharge = 0;
  if (terms) {
    for (const line of single ? draft.lines.slice(0, 1) : draft.lines) {
      const amount = single ? roundMoney(total) : (parseMoneyInput(line.amountText) ?? 0);
      const charges = computePaymentCharges(
        {
          method: line.method,
          amount,
          installments: line.installments,
          waiveSurcharge: line.waiveSurcharge,
        },
        terms,
        at,
      );
      lineCharges[line.key] = charges;
      surcharge = roundMoney(surcharge + charges.surchargeAmount);
    }
  }
  return { ...base, surcharge, totalToCharge: roundMoney(total + surcharge), lineCharges };
}

/**
 * Validación de montos del borrador. Con un único pago el monto
 * es el total (no se envía — el backend usa el que calcula él). Con pago mixto la suma de los
 * montos tiene que dar exactamente el total.
 */
function summarizeAmounts(
  draft: PaymentDraft,
  total: number,
): Omit<PaymentDraftSummary, "surcharge" | "totalToCharge" | "lineCharges"> {
  const saleTotal = roundMoney(total);

  if (!draft.split || draft.lines.length === 1) {
    const line = draft.lines[0];
    if (!line) {
      return {
        assigned: 0,
        remaining: saleTotal,
        change: null,
        error: "Elegí un medio de pago",
        payments: null,
      };
    }
    const payload = toPayload(line, undefined);
    let change: number | null = null;
    if (line.method === "cash" && line.receivedText.trim() !== "") {
      const received = parseMoneyInput(line.receivedText);
      if (received === null) {
        return {
          assigned: saleTotal,
          remaining: 0,
          change: null,
          error: "El monto recibido es inválido",
          payments: null,
        };
      }
      if (received + CENT_TOLERANCE < saleTotal) {
        return {
          assigned: saleTotal,
          remaining: 0,
          change: null,
          error: `El monto recibido es menor al total (faltan ${formatMoney(roundMoney(saleTotal - received))})`,
          payments: null,
        };
      }
      change = roundMoney(received - saleTotal);
      payload.amountReceived = received;
    }
    return { assigned: saleTotal, remaining: 0, change, error: null, payments: [payload] };
  }

  const payloads: PaymentInputPayload[] = [];
  let assigned = 0;
  let change: number | null = null;
  let error: string | null = null;

  draft.lines.forEach((line, index) => {
    const amount = parseMoneyInput(line.amountText);
    if (amount === null || amount <= 0) {
      error ??= `Completá el monto del pago ${index + 1}`;
      return;
    }
    assigned = roundMoney(assigned + amount);
    const payload = toPayload(line, amount);
    if (line.method === "cash" && line.receivedText.trim() !== "") {
      const received = parseMoneyInput(line.receivedText);
      if (received === null || received + CENT_TOLERANCE < amount) {
        error ??= `El monto recibido del pago ${index + 1} es menor a su monto`;
      } else {
        payload.amountReceived = received;
        change = roundMoney((change ?? 0) + received - amount);
      }
    }
    payloads.push(payload);
  });

  const remaining = roundMoney(saleTotal - assigned);
  if (!error && Math.abs(remaining) > CENT_TOLERANCE) {
    error =
      remaining > 0
        ? `Faltan asignar ${formatMoney(remaining)}`
        : `Los pagos superan el total por ${formatMoney(-remaining)}`;
  }

  return { assigned, remaining, change, error, payments: error ? null : payloads };
}

/** Activa el pago mixto: la línea actual queda con el total y se agrega una segunda vacía (con
 *  otro medio) para que la persona reparta el monto. */
export function enableSplitPayment(draft: PaymentDraft, total: number): PaymentDraft {
  const [first = createPaymentLine()] = draft.lines;
  return {
    split: true,
    lines: [
      { ...first, amountText: total > 0 ? moneyToInputText(total) : "", receivedText: "" },
      createPaymentLine(first.method === "cash" ? "credit_card" : "cash"),
    ],
  };
}

/** Vuelve a un único pago conservando el medio de la primera línea. */
export function disableSplitPayment(draft: PaymentDraft): PaymentDraft {
  const [first = createPaymentLine()] = draft.lines;
  return { split: false, lines: [{ ...first, amountText: "" }] };
}

/** Completa una línea con lo que falta asignar (botón "Resto" del pago mixto). */
export function fillRemaining(draft: PaymentDraft, key: string, total: number): PaymentDraft {
  const othersAssigned = draft.lines
    .filter((line) => line.key !== key)
    .reduce((sum, line) => sum + (parseMoneyInput(line.amountText) ?? 0), 0);
  const remaining = roundMoney(total - othersAssigned);
  return {
    ...draft,
    lines: draft.lines.map((line) =>
      line.key === key
        ? { ...line, amountText: remaining > 0 ? moneyToInputText(remaining) : "" }
        : line,
    ),
  };
}
