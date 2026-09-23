import { z } from "zod";

/** Body de `POST /admin/auth/login` — login del panel de administración (doc §7). */
export const adminLoginSchema = z.object({
  email: z.string({ required_error: "El email es obligatorio" }).trim().email("Email inválido"),
  password: z.string({ required_error: "La contraseña es obligatoria" }).min(8),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
