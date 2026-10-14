import type { PaymentMethod } from "@stocknegozia/api-contracts";
import { profitsRepository, type ProfitFilters } from "./repository";

export interface ProfitEntryDto {
  id: number;
  saleId: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  revenue: number;
  cost: number;
  profit: number;
  /** Medios con que se cobró la venta de esta línea. Vacío = "Sin especificar". */
  paymentMethods: PaymentMethod[];
  createdAt: string;
}

/** Mismo `roundMoney` que `salesService`/`productsService` (duplicado a propósito, ver esos
 *  archivos). */
function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

type ProfitRow = ReturnType<typeof profitsRepository.findMany>[number];

function toDto(row: ProfitRow, paymentMethods: PaymentMethod[]): ProfitEntryDto {
  const cost = roundMoney(row.unitCost * row.quantity);
  return {
    id: row.id,
    saleId: row.saleId,
    productId: row.productId,
    productName: row.productName,
    quantity: row.quantity,
    unitPrice: row.unitPrice,
    unitCost: row.unitCost,
    revenue: row.subtotal,
    cost,
    profit: roundMoney(row.subtotal - cost),
    paymentMethods,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Ventas únicamente — ver `features/profits/data/ledger.ts` para la versión combinada con
 *  ajustes de caja que efectivamente usa la pantalla de Ganancias. */
export const profitsService = {
  findMany(filters: ProfitFilters = {}): ProfitEntryDto[] {
    const rows = profitsRepository.findMany(filters);
    const methodsBySale = profitsRepository.findPaymentMethodsBySaleIds([
      ...new Set(rows.map((row) => row.saleId)),
    ]);
    return rows.map((row) => toDto(row, methodsBySale.get(row.saleId) ?? []));
  },
};
