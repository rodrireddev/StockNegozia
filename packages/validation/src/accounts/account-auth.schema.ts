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
  // Verificado siempre del lado del servidor contra la API de Cloudflare Turnstile — obligatorio
  // en cada intento de registro (a diferencia del login, que solo lo exige tras varios fallos).
  turnstileToken: z
    .string({ required_error: "Falta verificar el captcha" })
    .min(1, "Falta verificar el captcha"),
});

export type AccountRegisterInput = z.infer<typeof accountRegisterSchema>;

/**
 * Body de `POST /accounts/login`. `turnstileToken` es opcional: el backend solo lo exige a partir
 * del 5° login fallido consecutivo desde la misma IP (rate-limiting por abuso, no en cada login
 * normal) — el cliente lo manda recién cuando una respuesta previa le avisó que hace falta.
 */
export const accountLoginSchema = z.object({
  email: z.string({ required_error: "El email es obligatorio" }).trim().email("Email inválido"),
  password: z.string({ required_error: "La contraseña es obligatoria" }).min(8),
  turnstileToken: z.string().min(1).optional(),
});

export type AccountLoginInput = z.infer<typeof accountLoginSchema>;

/** Body de `POST /accounts/verify-email/confirm`. */
export const emailVerificationConfirmSchema = z.object({
  token: z.string({ required_error: "El token es obligatorio" }).min(1),
});

export type EmailVerificationConfirmInput = z.infer<typeof emailVerificationConfirmSchema>;

/**
 * Body de `POST /accounts/password-reset/request`. `turnstileToken` obligatorio en cada intento
 * (mismo criterio que el registro), verificado siempre del lado del servidor.
 */
export const passwordResetRequestSchema = z.object({
  email: z.string({ required_error: "El email es obligatorio" }).trim().email("Email inválido"),
  turnstileToken: z
    .string({ required_error: "Falta verificar el captcha" })
    .min(1, "Falta verificar el captcha"),
});

export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;

/** Body de `POST /accounts/password-reset/confirm`. */
export const passwordResetConfirmSchema = z.object({
  token: z.string({ required_error: "El token es obligatorio" }).min(1),
  newPassword: z.string({ required_error: "La contraseña nueva es obligatoria" }).min(8),
});

export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>;

/**
 * Body de `DELETE /accounts/me` — pedir la contraseña de nuevo es la barrera contra borrar la
 * cuenta con solo un JWT robado/filtrado (ej. de un dispositivo prestado/perdido), dado que la
 * acción es irreversible (política de borrado de cuenta de Google Play).
 */
export const deleteAccountSchema = z.object({
  password: z.string({ required_error: "La contraseña es obligatoria" }).min(1),
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
