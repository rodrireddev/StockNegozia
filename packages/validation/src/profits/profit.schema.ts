import { z } from "zod";

/** Filtros de `GET /profits` — todos opcionales, se combinan con AND (mismo criterio que
 *  `stockMovementQuerySchema`). */
export const profitQuerySchema = z.object({
  productId: z.coerce.number().int().positive().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type ProfitQueryInput = z.infer<typeof profitQuerySchema>;
