export type SaleStatus = "completed" | "cancelled";

export interface SaleItemDto {
  id: number;
  productId: number;
  quantity: number;
  /** Precio unitario histórico al momento de la venta — no el precio actual del producto. */
  unitPrice: number;
  subtotal: number;
}

export interface SaleSummaryDto {
  id: number;
  status: SaleStatus;
  total: number;
  createdAt: string;
  cancelledAt: string | null;
}

export interface SaleDto extends SaleSummaryDto {
  items: SaleItemDto[];
}
