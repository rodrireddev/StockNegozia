import { BadRequestError } from "@/database/errors";
import {
  cashAdjustmentsRepository,
  type CashAdjustmentFilters,
  type NewCashAdjustmentRecord,
} from "./repository";

export interface CashAdjustmentDto {
  id: number;
  direction: "IN" | "OUT";
  amount: number;
  reason: string;
  createdAt: string;
}

type CashAdjustmentRow = ReturnType<typeof cashAdjustmentsRepository.findMany>[number];

function toDto(row: CashAdjustmentRow): CashAdjustmentDto {
  return {
    id: row.id,
    direction: row.direction,
    amount: row.amount,
    reason: row.reason,
    createdAt: row.createdAt.toISOString(),
  };
}

export interface CreateCashAdjustmentInput {
  direction: "IN" | "OUT";
  amount: number;
  reason: string;
}

/**
 * Retiros/ingresos de caja sin relación con ninguna venta ni producto — ver comentario en
 * `database/schema/cash-adjustments.ts`. Responsabilidad exclusiva: registrar y consultar. Nunca
 * toca `products.stock` ni ninguna otra tabla — es el único módulo que escribe en
 * `cash_adjustments`.
 */
export const cashAdjustmentsService = {
  create(input: CreateCashAdjustmentInput): CashAdjustmentDto {
    if (!(input.amount > 0)) {
      throw new BadRequestError("El monto tiene que ser mayor a cero");
    }
    if (!input.reason.trim()) {
      throw new BadRequestError("El motivo es obligatorio");
    }

    const record: NewCashAdjustmentRecord = {
      direction: input.direction,
      amount: input.amount,
      reason: input.reason.trim(),
    };
    return toDto(cashAdjustmentsRepository.insert(record));
  },

  findMany(filters: CashAdjustmentFilters = {}): CashAdjustmentDto[] {
    return cashAdjustmentsRepository.findMany(filters).map(toDto);
  },
};
