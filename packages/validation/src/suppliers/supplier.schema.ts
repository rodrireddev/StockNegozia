import { z } from "zod";

export const createSupplierSchema = z.object({
  name: z
    .string({ required_error: "El nombre es obligatorio" })
    .trim()
    .min(1, "El nombre es obligatorio"),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
