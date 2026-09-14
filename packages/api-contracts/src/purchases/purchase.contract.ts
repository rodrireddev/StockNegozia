export interface PurchaseItemDto {
  id: number;
  productId: number;
  quantity: number;
  unitCost: number;
  subtotal: number;
}

export interface PurchaseSummaryDto {
  id: number;
  supplierId: number;
  supplierName: string;
  /** Suma de subtotales de `purchase_items` — calculado por el backend, nunca recibido del cliente. */
  total: number;
  createdAt: string;
}

export interface PurchaseDto extends PurchaseSummaryDto {
  items: PurchaseItemDto[];
}
