import type { StockMovementDto, StockMovementType } from "@stocknegozia/api-contracts";

export const MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  PURCHASE: "Compra",
  SALE: "Venta",
  SALE_CANCELLATION: "Cancelación de venta",
  ADJUSTMENT: "Ajuste",
};

/** Cantidad con signo según la dirección — el texto nunca depende solo del color. */
export function formatSignedQuantity(movement: Pick<StockMovementDto, "direction" | "quantity">): string {
  const sign = movement.direction === "IN" ? "+" : "-";
  return `${sign}${movement.quantity}`;
}

/** Referencia legible a la venta/compra que originó el movimiento, cuando corresponde. */
export function describeMovementReference(
  movement: Pick<StockMovementDto, "saleId" | "purchaseId" | "reason">,
): string | null {
  if (movement.saleId !== null) return `Venta #${movement.saleId}`;
  if (movement.purchaseId !== null) return `Compra #${movement.purchaseId}`;
  if (movement.reason) return movement.reason;
  return null;
}
