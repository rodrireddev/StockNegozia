export type CashAdjustmentDirection = "IN" | "OUT";

/**
 * Movimiento de efectivo de caja sin relación con ninguna venta ni compra — ver
 * docs/inventory/CASH_ADJUSTMENTS.md (o el comentario del schema del backend) para el
 * razonamiento completo de por qué vive en su propia tabla en vez de mezclarse con `sale_items`.
 */
export interface CashAdjustmentDto {
  id: number;
  direction: CashAdjustmentDirection;
  /** Siempre positivo — la dirección es un campo separado. */
  amount: number;
  reason: string;
  createdAt: string;
}
