import type { PaymentMethod, SalePaymentDto } from "./payment.contract";

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
  /** `null` = venta de mostrador sin cliente asociado. */
  customerId?: number | null;
  /** Medios de pago usados (sin repetir). Vacío en ventas anteriores a los medios de pago. */
  paymentMethods: PaymentMethod[];
}

export interface SaleDto extends SaleSummaryDto {
  items: SaleItemDto[];
  /** Vacío en ventas registradas antes de que existieran los medios de pago. */
  payments: SalePaymentDto[];
}
