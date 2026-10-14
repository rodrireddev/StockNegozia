import { z } from "zod";

/** Rango de fechas de las vistas de Finanzas. Sin `from`/`to` el backend usa el día de hoy. El
 *  rango se limita a ~1 año para no forzar agregaciones arbitrariamente grandes. */
export const financeRangeQuerySchema = z
  .object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .refine(
    (range) =>
      !range.from || !range.to || range.to.getTime() - range.from.getTime() <= 400 * 86_400_000,
    { message: "El rango no puede superar un año" },
  );

export type FinanceRangeQueryInput = z.infer<typeof financeRangeQuerySchema>;

export const topProductsQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type TopProductsQueryInput = z.infer<typeof topProductsQuerySchema>;

export const settlementsQuerySchema = z.object({
  status: z.enum(["pending", "settled", "all"]).default("pending"),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type SettlementsQueryInput = z.infer<typeof settlementsQuerySchema>;
