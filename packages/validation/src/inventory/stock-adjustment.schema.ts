import { z } from "zod";

/**
 * Body de `POST /products/:id/stock-adjustments` — ver docs/inventory/STOCK_MOVEMENTS.md. `stock`
 * es el valor ABSOLUTO deseado (no un delta): el backend calcula internamente
 * `delta = stock - stockActual` y lo aplica vía `ProductsService.adjustStock()`. Deliberadamente
 * un contrato propio, no reutiliza ningún schema de `Product` — esto representa la semántica de
 * un ajuste de inventario, no una actualización genérica de producto.
 */
export const stockAdjustmentSchema = z.object({
  stock: z.coerce
    .number({ required_error: "El stock es obligatorio" })
    .int("El stock debe ser un número entero")
    .min(0, "El stock no puede ser negativo")
    .finite("El stock no puede ser infinito"),
  reason: z
    .string({ required_error: "El motivo es obligatorio" })
    .trim()
    .min(1, "El motivo es obligatorio")
    .max(200, "El motivo no puede superar los 200 caracteres"),
});

export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
