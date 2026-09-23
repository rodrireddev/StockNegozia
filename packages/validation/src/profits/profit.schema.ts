import { z } from "zod";

/** Filtros de `GET /profits` — todos opcionales, se combinan con AND (mismo criterio que
 *  `stockMovementQuerySchema`). */
export const profitQuerySchema = z.object({
  productId: z.coerce.number().int().positive().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type ProfitQueryInput = z.infer<typeof profitQuerySchema>;

/** `GET /profits/daily` — cantidad de días hacia atrás (hoy incluido) a agrupar, para el gráfico
 *  semanal. Tope de 90 para no forzar una agregación arbitrariamente grande desde el cliente. */
export const dailyProfitQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(7),
});

export type DailyProfitQueryInput = z.infer<typeof dailyProfitQuerySchema>;

/** `GET /profits/hourly` — un único día puntual (`YYYY-MM-DD`), para el gráfico "Diario". Sin
 *  `date` se usa el día de hoy (ver `ProfitsService.findHourlySummary`). */
export const hourlyProfitQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (esperado YYYY-MM-DD)")
    .optional(),
});

export type HourlyProfitQueryInput = z.infer<typeof hourlyProfitQuerySchema>;
