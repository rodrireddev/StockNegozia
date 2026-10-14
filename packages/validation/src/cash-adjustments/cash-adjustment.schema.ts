import { MAX_MONEY_AMOUNT } from "@stocknegozia/api-contracts";
import { z } from "zod";

export const cashAdjustmentDirectionSchema = z.enum(["IN", "OUT"]);

export const createCashAdjustmentSchema = z.object({
  direction: cashAdjustmentDirectionSchema,
  amount: z.coerce
    .number({ invalid_type_error: "El monto es inválido" })
    .positive("El monto tiene que ser mayor a cero")
    .max(MAX_MONEY_AMOUNT, "El monto supera el máximo permitido"),
  reason: z
    .string({ required_error: "El motivo es obligatorio" })
    .trim()
    .min(1, "El motivo es obligatorio")
    .max(200, "El motivo no puede superar los 200 caracteres"),
});

export type CreateCashAdjustmentInput = z.infer<typeof createCashAdjustmentSchema>;

/** Filtros de `GET /cash-adjustments` — mismo criterio que `stockMovementQuerySchema`. */
export const cashAdjustmentQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type CashAdjustmentQueryInput = z.infer<typeof cashAdjustmentQuerySchema>;
