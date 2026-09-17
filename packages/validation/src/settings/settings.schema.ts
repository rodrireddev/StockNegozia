import { z } from "zod";

export const updateSettingsSchema = z.object({
  businessName: z
    .string()
    .trim()
    .max(120, "El nombre del negocio no puede superar los 120 caracteres")
    .nullable(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
