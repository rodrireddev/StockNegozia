import { z } from "zod";

export const saleItemInputSchema = z.object({
  productId: z.coerce
    .number({ required_error: "El producto es obligatorio" })
    .int()
    .positive("El producto es inválido"),
  quantity: z.coerce
    .number({ required_error: "La cantidad es obligatoria" })
    .int("La cantidad debe ser un número entero")
    .positive("La cantidad debe ser mayor a 0"),
});

export const createSaleSchema = z.object({
  items: z.array(saleItemInputSchema).min(1, "La venta debe tener al menos un ítem"),
});

export type SaleItemInput = z.infer<typeof saleItemInputSchema>;
export type CreateSaleInput = z.infer<typeof createSaleSchema>;
