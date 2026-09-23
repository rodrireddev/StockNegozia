import { Inject, Injectable } from "@nestjs/common";
import type { CashAdjustmentDto } from "@stocknegozia/api-contracts";
import type { CreateCashAdjustmentInput } from "@stocknegozia/validation";
import { AppLogger } from "../../common/logger/app-logger.service";
import {
  CashAdjustmentsRepository,
  type CashAdjustmentFilters,
} from "./cash-adjustments.repository";

type CashAdjustmentRow = ReturnType<CashAdjustmentsRepository["findMany"]>[number];

function toDto(row: CashAdjustmentRow): CashAdjustmentDto {
  return {
    id: row.id,
    direction: row.direction,
    amount: row.amount,
    reason: row.reason,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Retiros/ingresos de caja sin relación con ninguna venta ni producto — ver comentario en
 * `database/schema/cash-adjustments.ts`. Responsabilidad exclusiva: registrar y consultar. Nunca
 * toca `products.stock` ni ninguna otra tabla — es el único módulo que escribe en
 * `cash_adjustments`. `ProfitsService` lo consulta (sólo lectura) para armar el historial
 * combinado de "Ganancias", pero la creación siempre pasa por acá.
 */
@Injectable()
export class CashAdjustmentsService {
  constructor(
    @Inject(CashAdjustmentsRepository) private readonly repository: CashAdjustmentsRepository,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  create(input: CreateCashAdjustmentInput): CashAdjustmentDto {
    const row = this.repository.insert(input);
    this.logger.info({
      context: "CashAdjustmentsService",
      operation: "create",
      event: "cash_adjustment.created",
      message: "Cash adjustment created",
      metadata: { id: row.id, direction: row.direction, amount: row.amount },
    });
    return toDto(row);
  }

  findMany(filters: CashAdjustmentFilters = {}): CashAdjustmentDto[] {
    return this.repository.findMany(filters).map(toDto);
  }
}
