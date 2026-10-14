/**
 * Condiciones de cobro configurables por el negocio — cambian seguido (el procesador sube la
 * comisión, el banco cambia los planes de cuotas), así que no pueden ser constantes del código.
 *
 * - `surchargePercent`: recargo que se le cobra AL CLIENTE por pagar con ese medio/plan (ej. 15%
 *   por 6 cuotas). Se suma a lo que paga; no cambia el precio de los productos.
 * - `feePercent`: comisión que el procesador (Mercado Pago, Payway, banco...) le descuenta AL
 *   NEGOCIO. No la ve el cliente: sólo reduce lo que efectivamente se acredita.
 * - `settlementDays`: días hasta que la plata llega a la cuenta (0 = en el momento). En Argentina
 *   el procesador suele cobrar más comisión cuanto antes acredita.
 */
export interface PaymentPlanTermsDto {
  surchargePercent: number;
  feePercent: number;
  settlementDays: number;
}

/** Un plan de tarjeta de crédito: 1 pago, 3 cuotas, 6 cuotas... */
export interface CreditPlanTermsDto extends PaymentPlanTermsDto {
  installments: number;
}

export interface PaymentTermsDto {
  debit: PaymentPlanTermsDto;
  /** Planes de crédito ofrecidos en la pantalla de venta, ordenados por cuotas. Siempre incluye
   *  el de 1 pago. */
  credit: CreditPlanTermsDto[];
  /** QR / billetera virtual. */
  qr: PaymentPlanTermsDto;
  transfer: PaymentPlanTermsDto;
  /** `true`: `settlementDays` cuenta sólo días hábiles (lunes a viernes). */
  businessDays: boolean;
}

/** Tope de recargo/comisión aceptado (%). */
export const MAX_PAYMENT_TERMS_PERCENT = 100;
/** Tope de días de acreditación. */
export const MAX_SETTLEMENT_DAYS = 365;
/** Tope de planes de crédito configurables. */
export const MAX_CREDIT_PLANS = 12;
