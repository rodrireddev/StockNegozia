import { z } from "zod";

const deviceTypeSchema = z.enum(["desktop", "mobile", "tablet", "web", "other"]);

/**
 * Body de `POST /auth/bootstrap`. El `token` es el secreto de instalación de un solo uso
 * (archivo `bootstrap.token`, ver `BootstrapTokenService`) — no es la credential permanente del
 * dispositivo.
 */
export const bootstrapSchema = z.object({
  token: z.string({ required_error: "El token de bootstrap es obligatorio" }).min(16),
  name: z.string().trim().min(1).max(100).optional(),
  type: deviceTypeSchema.optional(),
});

export type BootstrapInput = z.infer<typeof bootstrapSchema>;

/**
 * Body de `POST /auth/pairing/confirm`. Lo envía el dispositivo nuevo (todavía sin credential) —
 * `token` es el pairing token temporal (del QR), no confundir con una credential de API.
 * `verificationCode` es el código corto que la persona lee/tipea manualmente, fuera del QR.
 */
export const pairingConfirmSchema = z.object({
  pairingId: z.string({ required_error: "pairingId es obligatorio" }).min(1),
  token: z.string({ required_error: "El pairing token es obligatorio" }).min(16),
  verificationCode: z
    .string({ required_error: "El código de verificación es obligatorio" })
    .regex(/^\d{6}$/, "Código de verificación inválido"),
  deviceName: z.string().trim().min(1).max(100).optional(),
  deviceType: deviceTypeSchema.optional(),
});

export type PairingConfirmInput = z.infer<typeof pairingConfirmSchema>;

/** Body de `POST /auth/pairing/cancel` — cancela una sesión de pairing propia todavía PENDING. */
export const pairingCancelSchema = z.object({
  pairingId: z.string({ required_error: "pairingId es obligatorio" }).min(1),
});

export type PairingCancelInput = z.infer<typeof pairingCancelSchema>;
