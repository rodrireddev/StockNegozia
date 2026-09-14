export type StockMovementType = "SALE" | "SALE_CANCELLATION" | "ADJUSTMENT";
export type StockMovementDirection = "IN" | "OUT";

/**
 * Historial auditable de modificaciones de stock — ver docs/inventory/STOCK_MOVEMENTS.md.
 * Complementa (no reemplaza) a `products.stock` (estado actual) y a `app.log` (diagnóstico
 * técnico): esto es el "por qué" y "cómo" llegó un producto a su stock actual.
 */
export interface StockMovementDto {
  id: number;
  productId: number;
  type: StockMovementType;
  direction: StockMovementDirection;
  /** Siempre positiva — la dirección (`IN`/`OUT`) es un campo separado, ver docs/inventory/STOCK_MOVEMENTS.md. */
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  /** Venta que originó el movimiento (`SALE`/`SALE_CANCELLATION`) — `null` para `ADJUSTMENT`. */
  saleId: number | null;
  /** `X-Request-Id` del request que originó el movimiento — `null` si ocurrió fuera de un contexto HTTP. */
  requestId: string | null;
  /** Obligatorio para `ADJUSTMENT` (validado al crear); `null` en `SALE`/`SALE_CANCELLATION` y en movimientos históricos anteriores a este campo. */
  reason: string | null;
  createdAt: string;
}
