import { z } from "zod";

/**
 * Body de `PATCH /admin/credit-config/:key` — balancear el costo/tope de una feature (doc §7).
 * `note` es opcional pero recomendado: queda en `credit_config_item_revisions` para explicar por
 * qué se ajustó ese número.
 */
export const updateCreditConfigItemSchema = z.object({
  value: z.number({ required_error: "El valor es obligatorio" }).int(),
  note: z.string().trim().max(500).optional(),
});

export type UpdateCreditConfigItemInput = z.infer<typeof updateCreditConfigItemSchema>;
