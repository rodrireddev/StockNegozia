export interface CustomerDto {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  documentNumber: string | null;
  notes: string | null;
  createdAt: string;
  /** Solo ventas completadas (no canceladas). */
  salesCount: number;
  totalSpent: number;
  lastSaleAt: string | null;
  /** Saldo de cuenta corriente: ventas a cuenta (no canceladas) − pagos registrados. Negativo =
   *  saldo a favor del cliente (ej. pagó y después se canceló la venta). */
  balance: number;
}

/** Medios con los que un cliente puede pagar su cuenta (todos menos la propia cuenta corriente). */
export const CUSTOMER_PAYMENT_METHODS = [
  "cash",
  "debit_card",
  "credit_card",
  "transfer",
  "qr",
  "other",
] as const;
export type CustomerPaymentMethod = (typeof CUSTOMER_PAYMENT_METHODS)[number];

export interface CustomerAccountEntryDto {
  /** `sale` suma deuda (venta a cuenta), `payment` la descuenta. */
  type: "sale" | "payment";
  id: number;
  amount: number;
  createdAt: string;
  saleId: number | null;
  method: CustomerPaymentMethod | null;
  note: string | null;
}

export interface CustomerAccountDto {
  customerId: number;
  balance: number;
  /** Más nuevo primero. */
  entries: CustomerAccountEntryDto[];
}
