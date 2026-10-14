import { Inject, Injectable } from "@nestjs/common";
import type { PaymentMethod, ProfitEntryDto } from "@stocknegozia/api-contracts";
import { ProfitsRepository, type ProfitFilters } from "./profits.repository";

type ProfitRow = ReturnType<ProfitsRepository["findMany"]>[number];

/** Mismo `roundMoney` que `SalesService`/`ProductsService` (duplicado a propósito, ver esos
 *  archivos). */
function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

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
    deviceName: row.deviceName,
    deviceType: row.deviceType,
    paymentMethods,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Ganancia de cada línea de venta — ver docs/inventory/STOCK_MOVEMENTS.md para el criterio de
 * "precio histórico" que acá aplica también al costo. Sólo ventas: los ajustes de caja NO se
 * mezclan en la ganancia (se ven aparte, en Finanzas → Caja). Responsabilidad exclusiva:
 * consultar; el snapshot `unitCost` se genera en `SalesService.create()`.
 */
@Injectable()
export class ProfitsService {
  constructor(@Inject(ProfitsRepository) private readonly repository: ProfitsRepository) {}

  findMany(filters: ProfitFilters = {}): ProfitEntryDto[] {
    const rows = this.repository.findMany(filters);
    const methodsBySale = this.repository.findPaymentMethodsBySaleIds([
      ...new Set(rows.map((row) => row.saleId)),
    ]);
    return rows.map((row) => toDto(row, methodsBySale.get(row.saleId) ?? []));
  }
}
