import { Inject, Injectable } from "@nestjs/common";
import type {
  DailyProfitDto,
  HourlyProfitDto,
  ProfitEntryDto,
  ProfitLedgerEntryDto,
} from "@stocknegozia/api-contracts";
import { CashAdjustmentsService } from "../cash-adjustments/cash-adjustments.service";
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

/** La ganancia "neta" de una línea del historial combinado — para una venta es su margen; para
 *  un ajuste de caja es el monto con signo (un retiro resta, un ingreso suma). */
function ledgerEntryProfit(entry: ProfitLedgerEntryDto): number {
  if (entry.kind === "sale") return entry.profit;
  return entry.direction === "IN" ? entry.amount : -entry.amount;
}

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date): Date {
  const copy = startOfDay(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function toDateKey(date: Date): string {
  const local = startOfDay(date);
  const year = local.getFullYear();
  const month = String(local.getMonth() + 1).padStart(2, "0");
  const day = String(local.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Parsea una clave `YYYY-MM-DD` como fecha LOCAL, nunca UTC — un `new Date("YYYY-MM-DD")` directo
 *  interpretaría la fecha en UTC y podría mostrar el día anterior/siguiente según la zona horaria
 *  del servidor. */
function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

/**
 * Ganancias — ver docs/inventory/STOCK_MOVEMENTS.md para el mismo criterio de "precio histórico"
 * que acá aplica también al costo. Combina ventas (esta misma clase) con ajustes de caja
 * (`CashAdjustmentsService`, ver ese módulo) en un único historial de lectura — ver
 * `ProfitLedgerEntryDto` para el porqué de esta separación. Responsabilidad exclusiva: consultar.
 * Nunca escribe nada — el snapshot `unitCost` se genera en `SalesService.create()`, y los ajustes
 * de caja se crean exclusivamente en `CashAdjustmentsService.create()`.
 */
@Injectable()
export class ProfitsService {
  constructor(
    @Inject(ProfitsRepository) private readonly repository: ProfitsRepository,
    @Inject(CashAdjustmentsService) private readonly cashAdjustmentsService: CashAdjustmentsService,
  ) {}

  findMany(filters: ProfitFilters = {}): ProfitEntryDto[] {
    return this.repository.findMany(filters).map(toDto);
  }

  /**
   * Combina ventas y ajustes de caja en un único historial ordenado. Filtrar por `productId` sólo
   * tiene sentido para ventas (un ajuste de caja no está atado a ningún producto), así que en ese
   * caso los ajustes se excluyen del todo en vez de listarlos sin filtrar.
   */
  findLedger(filters: ProfitFilters = {}): ProfitLedgerEntryDto[] {
    const sales: ProfitLedgerEntryDto[] = this.findMany(filters).map((entry) => ({
      kind: "sale" as const,
      ...entry,
    }));

    if (filters.productId !== undefined) return sales;

    const adjustments: ProfitLedgerEntryDto[] = this.cashAdjustmentsService
      .findMany(filters)
      .map((entry) => ({ kind: "cashAdjustment" as const, ...entry }));

    return [...sales, ...adjustments].sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
  }

  /**
   * Ganancia agrupada por día para los últimos `days` (hoy incluido), en orden cronológico
   * ascendente — pensado para el gráfico semanal. `revenue`/`cost` sólo suman ventas; `profit`
   * también incluye el impacto de los ajustes de caja de ese día, nunca `revenue`/`cost` (que
   * siguen siendo pura economía de venta). Un día sin movimientos aparece con todo en 0 en vez de
   * faltar, para que el eje X del gráfico siempre tenga el mismo largo.
   */
  findDailySummary(days = 7): DailyProfitDto[] {
    const today = startOfDay(new Date());
    const from = new Date(today);
    from.setDate(from.getDate() - (days - 1));

    const entries = this.findLedger({ from });

    const byDate = new Map<string, { revenue: number; cost: number; profit: number }>();
    for (const entry of entries) {
      const key = toDateKey(new Date(entry.createdAt));
      const bucket = byDate.get(key) ?? { revenue: 0, cost: 0, profit: 0 };
      if (entry.kind === "sale") {
        bucket.revenue = roundMoney(bucket.revenue + entry.revenue);
        bucket.cost = roundMoney(bucket.cost + entry.cost);
      }
      bucket.profit = roundMoney(bucket.profit + ledgerEntryProfit(entry));
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

  /**
   * Ganancia agrupada por hora (0 a 23) de UN único día — pensado para el gráfico "Diario". Sin
   * `dateKey` usa el día de hoy. Mismo criterio que `findDailySummary` sobre qué suma cada campo.
   */
  findHourlySummary(dateKey?: string): HourlyProfitDto[] {
    const day = dateKey ? parseDateKey(dateKey) : new Date();
    const from = startOfDay(day);
    const to = endOfDay(day);

    const entries = this.findLedger({ from, to });

    const byHour = new Map<number, { revenue: number; cost: number; profit: number }>();
    for (const entry of entries) {
      const hour = new Date(entry.createdAt).getHours();
      const bucket = byHour.get(hour) ?? { revenue: 0, cost: 0, profit: 0 };
      if (entry.kind === "sale") {
        bucket.revenue = roundMoney(bucket.revenue + entry.revenue);
        bucket.cost = roundMoney(bucket.cost + entry.cost);
      }
      bucket.profit = roundMoney(bucket.profit + ledgerEntryProfit(entry));
      byHour.set(hour, bucket);
    }

    const result: HourlyProfitDto[] = [];
    for (let hour = 0; hour < 24; hour++) {
      const bucket = byHour.get(hour) ?? { revenue: 0, cost: 0, profit: 0 };
      result.push({ hour, label: `${hour}h`, ...bucket });
    }
    return result;
  }
}
