import { z } from "zod";

/**
 * Body de `POST /accounts/register` (doc §3). El email+password es el mecanismo simple de v1 — el
 * doc deja pendiente evaluar registro por teléfono/OTP para LatAm, no se implementa todavía.
 * `referralCode` es opcional: solo se manda si el usuario llegó invitado (doc §1, referidos).
 */
export const accountRegisterSchema = z.object({
  email: z.string({ required_error: "El email es obligatorio" }).trim().email("Email inválido"),
  password: z.string({ required_error: "La contraseña es obligatoria" }).min(8),
  referralCode: z.string().trim().min(1).optional(),
});

export type AccountRegisterInput = z.infer<typeof accountRegisterSchema>;

/** Body de `POST /accounts/login`. */
export const accountLoginSchema = z.object({
  email: z.string({ required_error: "El email es obligatorio" }).trim().email("Email inválido"),
  password: z.string({ required_error: "La contraseña es obligatoria" }).min(8),
});

export type AccountLoginInput = z.infer<typeof accountLoginSchema>;
