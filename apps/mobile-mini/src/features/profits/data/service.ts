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
  createdAt: string;
}

export interface DailyProfitDto {
  /** `YYYY-MM-DD` en horario local del dispositivo. */
  date: string;
  /** Abreviatura del día en español ("Lun", "Mar"...), lista para el eje X del gráfico. */
  label: string;
  revenue: number;
  cost: number;
  profit: number;
}

/** Mismo `roundMoney` que `salesService`/`productsService` (duplicado a propósito, ver esos
 *  archivos). */
function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

type ProfitRow = ReturnType<typeof profitsRepository.findMany>[number];

function toDto(row: ProfitRow): ProfitEntryDto {
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
    createdAt: row.createdAt.toISOString(),
  };
}

/** Ventas únicamente — ver `features/profits/data/ledger.ts` para la versión combinada con
 *  ajustes de caja que efectivamente usa la pantalla de Ganancias. */
export const profitsService = {
  findMany(filters: ProfitFilters = {}): ProfitEntryDto[] {
    return profitsRepository.findMany(filters).map(toDto);
  },
};
