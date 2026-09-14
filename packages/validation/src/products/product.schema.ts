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

export const createProductSchema = productBaseSchema.extend({
  stock: z.coerce.number().int().min(0, "El stock no puede ser negativo").default(0),
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
