/**
 * Medio de cobro de una venta. Modelado como en los POS de referencia (Odoo, Loyverse, Square):
 * una venta tiene uno O VARIOS pagos (`SalePaymentDto`), así se puede registrar un pago mixto
 * ("$ 50.000 en efectivo + el resto con tarjeta") sin inventar un medio "mixto".
 *
 * - `cash`: efectivo — admite "paga con" (`amountReceived`) para calcular el vuelto.
 * - `debit_card` / `credit_card`: tarjeta — marca y n° de cupón/lote opcionales; crédito además
 *   admite cuotas (`installments`).
 * - `transfer`: transferencia bancaria (CBU/CVU/alias) — n° de operación opcional.
 * - `qr`: QR / billetera virtual (Mercado Pago, MODO, etc.) — n° de operación opcional.
 * - `other`: cualquier otro medio (cheque...) — referencia libre.
 * - `account`: cuenta corriente (fiado) — exige un cliente en la venta; no es plata cobrada: suma
 *   al saldo del cliente hasta que registre un pago (`POST /customers/:id/payments`).
 */
export const PAYMENT_METHODS = [
  "cash",
  "debit_card",
  "credit_card",
  "transfer",
  "qr",
  "other",
  "account",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const CARD_BRANDS = [
  "visa",
  "mastercard",
  "amex",
  "cabal",
  "naranja",
  "maestro",
  "other",
] as const;

export type CardBrand = (typeof CARD_BRANDS)[number];

/** Planes de cuotas por defecto (habituales en AR) — los que se ofrecen en la venta salen de las
 *  condiciones de cobro configuradas (`PaymentTermsDto.credit`). */
export const CREDIT_CARD_INSTALLMENT_OPTIONS = [1, 3, 6, 9, 12, 18, 24] as const;

/** Tope de cuotas aceptado por la validación. */
export const MAX_CREDIT_CARD_INSTALLMENTS = 48;

/** Cantidad máxima de pagos en una misma venta (pago mixto). */
export const MAX_SALE_PAYMENTS = 6;

export interface SalePaymentDto {
  id: number;
  method: PaymentMethod;
  /** Monto aplicado a la venta con este medio. La suma de todos los pagos = `SaleDto.total`. */
  amount: number;
  /** Sólo `credit_card`. */
  installments: number | null;
  /** Sólo tarjetas (`debit_card`/`credit_card`). */
  cardBrand: CardBrand | null;
  /** N° de cupón/lote (tarjeta) o de operación (transferencia/QR). Nunca el número de tarjeta. */
  reference: string | null;
  /** Sólo `cash`: con cuánto pagó el cliente. */
  amountReceived: number | null;
  /** Sólo `cash`: `amountReceived - amount`. */
  change: number | null;
  /** Recargo al cliente aplicado (% y monto), según las condiciones de cobro vigentes al momento
   *  de la venta — ver `PaymentTermsDto`. 0 si no aplica o se bonificó. */
  surchargePercent: number;
  surchargeAmount: number;
  /** Comisión estimada del procesador (% y monto) — la paga el negocio, no el cliente. */
  feePercent: number;
  feeAmount: number;
  /** Lo que efectivamente se acredita: `amount + surchargeAmount - feeAmount`. */
  netAmount: number;
  /** Fecha estimada de acreditación (ISO). `null` = se cobra en el momento (efectivo/otro). */
  settlementDate: string | null;
}

/** Total cobrado con cada medio de pago en un período — "¿cuánto entró en efectivo y cuánto por
 *  transferencia?". Sólo ventas `completed`. */
export interface PaymentMethodTotalDto {
  /** `null` = ventas registradas antes de que existiera el medio de pago ("Sin especificar"). */
  method: PaymentMethod | null;
  amount: number;
  /** Cantidad de ventas que usaron este medio (una venta con pago mixto cuenta en cada medio). */
  salesCount: number;
  /** Recargos cobrados al cliente con este medio. */
  surchargeAmount: number;
  /** Comisiones estimadas del procesador. */
  feeAmount: number;
  /** `amount + surchargeAmount - feeAmount` — lo que entra (o va a entrar) a la cuenta. */
  netAmount: number;
}
