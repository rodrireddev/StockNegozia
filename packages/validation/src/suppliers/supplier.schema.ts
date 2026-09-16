import { z } from "zod";

export const createSupplierSchema = z.object({
  name: z
    .string({ required_error: "El nombre es obligatorio" })
    .trim()
    .min(1, "El nombre es obligatorio"),
  phone: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : undefined)),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;

/**
 * `PATCH /suppliers/:id` — editar un proveedor existente (nombre y/o teléfono) sin afectar el
 * historial: las compras ya creadas conservan su propio snapshot (`purchases.supplierName`, ver
 * database/schema/purchases.ts), así que renombrar un proveedor acá nunca reescribe compras
 * pasadas. Refleja siempre el estado completo de ambos campos (no es un PATCH parcial disperso) —
 * mismo criterio que un formulario de edición que reenvía todo lo editable.
 */
export const updateSupplierSchema = createSupplierSchema;

export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
