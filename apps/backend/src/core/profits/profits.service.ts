import { Inject, Injectable } from "@nestjs/common";
import type { DailyProfitDto, ProfitEntryDto } from "@stocknegozia/api-contracts";
import { ProfitsRepository, type ProfitFilters } from "./profits.repository";

type ProfitRow = ReturnType<ProfitsRepository["findMany"]>[number];

/** Mismo `roundMoney` que `SalesService`/`ProductsService` (duplicado a propósito, ver esos
 *  archivos). */
function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

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
    deviceName: row.deviceName,
    deviceType: row.deviceType,
    createdAt: row.createdAt.toISOString(),
  };
}

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function toDateKey(date: Date): string {
  const local = startOfDay(date);
  const year = local.getFullYear();
  const month = String(local.getMonth() + 1).padStart(2, "0");
  const day = String(local.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Ganancias por venta — ver docs/inventory/STOCK_MOVEMENTS.md para el mismo criterio de "precio
 * histórico" que acá aplica también al costo. Responsabilidad exclusiva: consultar. Nunca escribe
 * nada — el snapshot `unitCost` se genera en `SalesService.create()`.
 */
@Injectable()
export class ProfitsService {
  constructor(@Inject(ProfitsRepository) private readonly repository: ProfitsRepository) {}

  findMany(filters: ProfitFilters = {}): ProfitEntryDto[] {
    return this.repository.findMany(filters).map(toDto);
  }

  /**
   * Ganancia agrupada por día para los últimos `days` (hoy incluido), en orden cronológico
   * ascendente — pensado para el gráfico semanal. Un día sin ventas aparece con todo en 0 en vez
   * de faltar, para que el eje X del gráfico siempre tenga el mismo largo.
   */
  findDailySummary(days = 7): DailyProfitDto[] {
    const today = startOfDay(new Date());
    const from = new Date(today);
    from.setDate(from.getDate() - (days - 1));

    const entries = this.findMany({ from });

    const byDate = new Map<string, { revenue: number; cost: number; profit: number }>();
    for (const entry of entries) {
      const key = toDateKey(new Date(entry.createdAt));
      const bucket = byDate.get(key) ?? { revenue: 0, cost: 0, profit: 0 };
      bucket.revenue = roundMoney(bucket.revenue + entry.revenue);
      bucket.cost = roundMoney(bucket.cost + entry.cost);
      bucket.profit = roundMoney(bucket.profit + entry.profit);
      byDate.set(key, bucket);
    }

    const result: DailyProfitDto[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(from);
      date.setDate(date.getDate() + i);
      const key = toDateKey(date);
      const bucket = byDate.get(key) ?? { revenue: 0, cost: 0, profit: 0 };
      result.push({ date: key, label: DAY_LABELS[date.getDay()] ?? "", ...bucket });
    }
    return result;
  }
}
