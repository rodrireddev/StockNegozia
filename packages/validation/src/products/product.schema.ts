import { z } from "zod";

const optionalTrimmedString = () =>
  z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : undefined));

export const productBaseSchema = z.object({
  name: z
    .string({ required_error: "El nombre es obligatorio" })
    .trim()
    .min(1, "El nombre es obligatorio"),
  sku: z.string({ required_error: "El SKU es obligatorio" }).trim().min(1, "El SKU es obligatorio"),
  barcode: optionalTrimmedString(),
  description: optionalTrimmedString(),
  categoryId: z.coerce.number().int().positive().optional(),
  categoryName: optionalTrimmedString(),
  purchasePrice: z.coerce.number().min(0, "El precio de compra no puede ser negativo"),
  salePrice: z.coerce.number().min(0, "El precio de venta no puede ser negativo"),
  minimumStock: z.coerce.number().int().min(0, "El stock mínimo no puede ser negativo").default(0),
  image: optionalTrimmedString(),
  active: z.boolean().default(true),
});

export const createProductSchema = productBaseSchema
  .extend({
    stock: z.coerce.number().int().min(0, "El stock no puede ser negativo").default(0),
    /**
     * Proveedor del stock inicial — igual que en una compra (`createPurchaseSchema` también exige
     * `supplierId`), nunca un valor inventado por el backend. `supplierId` para elegir uno
     * existente, `supplierName` para crear uno nuevo desde el propio formulario (mismo patrón que
     * `categoryId`/`categoryName`). Obligatorio uno de los dos cuando `stock > 0` — ver el
     * `.refine()` más abajo: un stock inicial sin proveedor no es un caso de negocio válido.
     */
    supplierId: z.coerce.number().int().positive("El proveedor es inválido").optional(),
    supplierName: optionalTrimmedString(),
  })
  .refine((data) => data.stock === 0 || data.supplierId !== undefined || data.supplierName !== undefined, {
    message: "El proveedor es obligatorio para registrar el stock inicial",
    path: ["supplierId"],
  });

export const updateProductSchema = productBaseSchema.partial();

export const activeUpdateSchema = z.object({
  active: z.boolean(),
});

export const productQuerySchema = z.object({
  search: z.string().trim().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  status: z.enum(["active", "inactive", "all"]).default("active"),
  stockStatus: z.enum(["normal", "low", "out", "all"]).default("all"),
  sortBy: z.enum(["name", "sku", "salePrice", "stock"]).default("name"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ActiveUpdateInput = z.infer<typeof activeUpdateSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
