import type { DeviceType } from "../auth/auth.contract";

export type StockMovementType = "SALE" | "SALE_CANCELLATION" | "ADJUSTMENT" | "PURCHASE";
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
  /** Venta que originó el movimiento (`SALE`/`SALE_CANCELLATION`) — `null` para `ADJUSTMENT`/`PURCHASE`. */
  saleId: number | null;
  /** Compra que originó el movimiento (`PURCHASE`) — `null` para el resto de los tipos. */
  purchaseId: number | null;
  /** `X-Request-Id` del request que originó el movimiento — `null` si ocurrió fuera de un contexto HTTP. */
  requestId: string | null;
  /** Obligatorio para `ADJUSTMENT` (validado al crear); `null` en `SALE`/`SALE_CANCELLATION` y en movimientos históricos anteriores a este campo. */
  reason: string | null;
  /**
   * Dispositivo que originó el movimiento — resuelto SIEMPRE desde el contexto autenticado del
   * request (`RequestContext`/`ApiAccessGuard`), nunca de un valor enviado por el cliente. `null`
   * cuando no hay dispositivo autenticado (`API_ACCESS_MODE=development`, fuera de un contexto
   * HTTP) o en movimientos anteriores a este campo — nunca se infiere ni se inventa.
   */
  deviceId: string | null;
  /**
   * Snapshot del nombre del dispositivo en el momento del movimiento — no se resuelve por JOIN
   * contra `devices` en cada lectura (a diferencia de `unitValue`), porque el nombre de un
   * dispositivo puede cambiar después (`PATCH /auth/devices/:id`) y un movimiento histórico no
   * debe reflejar ese cambio retroactivamente.
   */
  deviceName: string | null;
  deviceType: DeviceType | null;
  /**
   * Valor unitario de la operación en el momento en que ocurrió — nunca el precio ACTUAL del
   * producto (ver docs/inventory/STOCK_MOVEMENTS.md §Precio histórico). Semántica según `type`:
   * costo pagado (`PURCHASE`), precio cobrado (`SALE`/`SALE_CANCELLATION`, tomado de la venta
   * original), o `null` para `ADJUSTMENT` (un ajuste no tiene precio de operación).
   */
  unitValue: number | null;
  createdAt: string;
}
