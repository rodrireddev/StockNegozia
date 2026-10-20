import type { CashAdjustmentDirection } from "../cash-adjustments/cash-adjustment.contract";
import type { CardBrand, PaymentMethod, PaymentMethodTotalDto } from "../sales/payment.contract";

/**
 * Finanzas ("Ganancias") — cuatro miradas SEPARADAS sobre el mismo período, sin mezclarlas:
 *
 * - Ventas: lo que se ganó vendiendo (vendido − costo de lo vendido = ganancia bruta).
 * - Compras: lo que se gastó en mercadería (reposición de stock).
 * - Caja: lo que se retiró (o ingresó) de la caja por fuera de las ventas, por motivo.
 * - Cobros: cómo entró la plata (medio de pago), recargos, comisiones y lo que falta acreditar.
 *
 * Antes los retiros de caja se restaban dentro de "Ganancia", y una venta muy buena con un retiro
 * grande el mismo día parecía un mal día de ventas. Las compras NO se restan de la ganancia: el
 * costo de la mercadería ya está en "costo de lo vendido" (se descontaría dos veces).
 */

/** Un punto de la serie temporal del período — un día, o una hora si el período es un solo día. */
export interface FinanceSeriesPointDto {
  /** `YYYY-MM-DD` (día) o `YYYY-MM-DDTHH` (hora). */
  key: string;
  /** Etiqueta corta para el eje X: "Lun", "12/10", "14h". */
  label: string;
  revenue: number;
  cost: number;
  profit: number;
  purchases: number;
  withdrawals: number;
}

export interface FinanceSalesSummaryDto {
  count: number;
  /** Vendido (precio de lista de los productos, sin recargos). */
  revenue: number;
  /** Costo de lo vendido (costo congelado al momento de cada venta). */
  cost: number;
  /** `revenue - cost`. */
  profit: number;
  /** `profit / revenue * 100`, o 0 sin ventas. */
  marginPercent: number;
  /** `revenue / count`, o 0 sin ventas. */
  averageTicket: number;
  unitsSold: number;
}

export interface FinanceSummaryDto {
  from: string;
  to: string;
  granularity: "hour" | "day";
  sales: FinanceSalesSummaryDto;
  purchases: { count: number; total: number };
  cash: { withdrawals: number; withdrawalsCount: number; deposits: number; depositsCount: number };
  collections: {
    /** Total cobrado (ventas + recargos). */
    total: number;
    surcharges: number;
    fees: number;
    /** `total - fees`. */
    net: number;
    byMethod: PaymentMethodTotalDto[];
  };
  /** Cuenta corriente (fiado). `soldOnAccount` y `received` son del período; `outstanding` es el
   *  saldo total adeudado por clientes HOY. Nada de esto está incluido en `collections`. */
  receivables: { soldOnAccount: number; received: number; outstanding: number };
  /** Pagos con tarjeta/QR/transferencia todavía no acreditados — a HOY, no al período. */
  pendingSettlement: { amount: number; count: number; nextDate: string | null };
  series: FinanceSeriesPointDto[];
}

export interface TopProductDto {
  productId: number;
  productName: string;
  quantity: number;
  revenue: number;
  cost: number;
  profit: number;
}

export type SettlementStatus = "pending" | "settled";

/** Un cobro con tarjeta/QR/transferencia y su acreditación estimada. */
export interface SettlementDto {
  paymentId: number;
  saleId: number;
  method: PaymentMethod;
  cardBrand: CardBrand | null;
  installments: number | null;
  amount: number;
  surchargeAmount: number;
  feeAmount: number;
  netAmount: number;
  createdAt: string;
  settlementDate: string;
  status: SettlementStatus;
}

/** Retiros/ingresos de caja agrupados por motivo (normalizado: sin mayúsculas ni espacios extra). */
export interface CashReasonGroupDto {
  direction: CashAdjustmentDirection;
  reason: string;
  total: number;
  count: number;
}
