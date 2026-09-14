import { z } from "zod";

export const stockMovementTypeSchema = z.enum(["SALE", "SALE_CANCELLATION", "ADJUSTMENT"]);
export const stockMovementDirectionSchema = z.enum(["IN", "OUT"]);

/** Filtros de `GET /stock-movements` — todos opcionales, se combinan con AND. */
export const stockMovementQuerySchema = z.object({
  productId: z.coerce.number().int().positive().optional(),
  type: stockMovementTypeSchema.optional(),
  direction: stockMovementDirectionSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type StockMovementQueryInput = z.infer<typeof stockMovementQuerySchema>;
