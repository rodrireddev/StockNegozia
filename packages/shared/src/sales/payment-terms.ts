import type {
  PaymentMethod,
  PaymentPlanTermsDto,
  PaymentTermsDto,
} from "@stocknegozia/api-contracts";
import { roundMoney } from "../money/money";

/**
 * Condiciones por defecto hasta que el negocio configure las suyas: sin recargos ni comisiones
 * (no inventamos porcentajes), y plazos de acreditación habituales en Argentina — débito al día
 * hábil siguiente, crédito a 10 días hábiles (el plazo intermedio que ofrecen los procesadores),
 * QR y transferencia en el momento. Todo editable en Configuración → Medios de pago.
 */
export const DEFAULT_PAYMENT_TERMS: PaymentTermsDto = {
  debit: { surchargePercent: 0, feePercent: 0, settlementDays: 1 },
  credit: [1, 3, 6, 12].map((installments) => ({
    installments,
    surchargePercent: 0,
    feePercent: 0,
    settlementDays: 10,
  })),
  qr: { surchargePercent: 0, feePercent: 0, settlementDays: 0 },
  transfer: { surchargePercent: 0, feePercent: 0, settlementDays: 0 },
  businessDays: true,
};

const NO_TERMS: PaymentPlanTermsDto = { surchargePercent: 0, feePercent: 0, settlementDays: 0 };

/**
 * Condiciones que aplican a un medio/plan. Efectivo y "otro" no tienen recargo, comisión ni
 * acreditación diferida (`null`). Un plan de cuotas que ya no está configurado usa las
 * condiciones del de 1 pago, sin recargo (nunca se le cobra al cliente un recargo inexistente).
 */
export function resolvePlanTerms(
  terms: PaymentTermsDto,
  method: PaymentMethod,
  installments = 1,
): PaymentPlanTermsDto | null {
  switch (method) {
    case "debit_card":
      return terms.debit;
    case "credit_card": {
      const exact = terms.credit.find((plan) => plan.installments === installments);
      if (exact) return exact;
      const single = terms.credit.find((plan) => plan.installments === 1) ?? terms.credit[0];
      return single ? { ...single, surchargePercent: 0 } : NO_TERMS;
    }
    case "qr":
      return terms.qr;
    case "transfer":
      return terms.transfer;
    default:
      return null;
  }
}

/** Suma `days` días (hábiles si `businessDays`) a `from`. 0 días = el mismo momento. */
export function addSettlementDays(from: Date, days: number, businessDays: boolean): Date {
  const result = new Date(from);
  if (!businessDays) {
    result.setDate(result.getDate() + days);
    return result;
  }
  let remaining = days;
  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    const weekday = result.getDay();
    if (weekday !== 0 && weekday !== 6) remaining -= 1;
  }
  return result;
}

export interface PaymentCharges {
  surchargePercent: number;
  surchargeAmount: number;
  feePercent: number;
  feeAmount: number;
  /** Lo que paga el cliente con este medio: `amount + surchargeAmount`. */
  chargedAmount: number;
  /** Lo que se acredita: `chargedAmount - feeAmount`. */
  netAmount: number;
  /** `null` = se cobra en el momento (efectivo, otro). */
  settlementDate: Date | null;
}

/**
 * Recargo, comisión y fecha de acreditación de un pago — misma cuenta en el backend (al guardar),
 * en Mobile Mini (al guardar localmente) y en las pantallas de venta (vista previa). La comisión
 * se calcula sobre lo cobrado (monto + recargo), que es sobre lo que la aplica el procesador.
 */
export function computePaymentCharges(
  payment: {
    method: PaymentMethod;
    amount: number;
    installments?: number;
    waiveSurcharge?: boolean;
  },
  terms: PaymentTermsDto,
  at: Date,
): PaymentCharges {
  const plan = resolvePlanTerms(terms, payment.method, payment.installments ?? 1);
  if (!plan) {
    return {
      surchargePercent: 0,
      surchargeAmount: 0,
      feePercent: 0,
      feeAmount: 0,
      chargedAmount: payment.amount,
      netAmount: payment.amount,
      settlementDate: null,
    };
  }
  const surchargePercent = payment.waiveSurcharge ? 0 : plan.surchargePercent;
  const surchargeAmount = roundMoney((payment.amount * surchargePercent) / 100);
  const chargedAmount = roundMoney(payment.amount + surchargeAmount);
  const feeAmount = roundMoney((chargedAmount * plan.feePercent) / 100);
  return {
    surchargePercent,
    surchargeAmount,
    feePercent: plan.feePercent,
    feeAmount,
    chargedAmount,
    netAmount: roundMoney(chargedAmount - feeAmount),
    settlementDate: addSettlementDays(at, plan.settlementDays, terms.businessDays),
  };
}

/** Planes de cuotas que ofrece la pantalla de venta (siempre incluye 1 pago). */
export function creditInstallmentOptions(terms: PaymentTermsDto): number[] {
  const options = terms.credit.map((plan) => plan.installments);
  return options.includes(1) ? options : [1, ...options];
}

/** "15%" / "2,5%" — porcentaje corto es-AR. */
export function formatPercent(value: number): string {
  return `${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(value)}%`;
}
