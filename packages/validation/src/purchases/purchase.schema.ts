import { z } from "zod";

export const purchaseItemInputSchema = z.object({
  productId: z.coerce
    .number({ required_error: "El producto es obligatorio" })
    .int()
    .positive("El producto es inválido"),
  quantity: z.coerce
    .number({ required_error: "La cantidad es obligatoria" })
    .int("La cantidad debe ser un número entero")
    .positive("La cantidad debe ser mayor a 0"),
  unitCost: z.coerce
    .number({ required_error: "El costo unitario es obligatorio" })
    .min(0, "El costo unitario no puede ser negativo")
    .finite("El costo unitario no puede ser infinito"),
});

/**
 * Body de `POST /purchases` — ver docs/inventory/PURCHASES.md. A diferencia de Sales (que
 * normaliza items duplicados sumando cantidades), acá dos items con el mismo `productId` dentro
 * de la misma compra se RECHAZAN: evita ambigüedad sobre a qué costo unitario corresponde cada
 * unidad. `total` no forma parte del contrato — el backend lo calcula siempre desde `items`.
 */
export const createPurchaseSchema = z.object({
  supplierId: z.coerce
    .number({ required_error: "El proveedor es obligatorio" })
    .int()
    .positive("El proveedor es inválido"),
  items: z
    .array(purchaseItemInputSchema)
    .min(1, "La compra debe tener al menos un ítem")
    .refine((items) => new Set(items.map((item) => item.productId)).size === items.length, {
      message: "No se puede repetir el mismo producto dentro de una misma compra",
    }),
});

export type PurchaseItemInput = z.infer<typeof purchaseItemInputSchema>;
export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
