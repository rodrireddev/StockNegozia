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

/**
 * Body de `PATCH /auth/devices/:id`. Solo permite renombrar — el resto de los campos
 * administrativos (`type`, `active`, `isAdmin`) no se exponen para edición directa en este
 * milestone (ver docs/security/DEVICE_MANAGEMENT.md).
 */
export const updateDeviceSchema = z.object({
  name: z
    .string({ required_error: "El nombre es obligatorio" })
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(100, "El nombre no puede superar los 100 caracteres")
    .refine(
      (value) => ![...value].some((char) => char.charCodeAt(0) < 0x20 || char.charCodeAt(0) === 0x7f),
      "El nombre contiene caracteres no permitidos",
    ),
});

export type UpdateDeviceInput = z.infer<typeof updateDeviceSchema>;

/**
 * Body de `PATCH /auth/devices/me/seller-name` — el "vendedor actual" que opera este dispositivo
 * (ver docs/inventory/STOCK_MOVEMENTS.md §Trazabilidad). No admite vaciarse: siempre hace falta un
 * nombre, porque Desktop bloquea el registro de ventas mientras no esté configurado.
 */
export const updateSellerNameSchema = z.object({
  sellerName: z
    .string({ required_error: "El nombre del vendedor es obligatorio" })
    .trim()
    .min(1, "El nombre del vendedor es obligatorio")
    .max(100, "El nombre no puede superar los 100 caracteres")
    .refine(
      (value) => ![...value].some((char) => char.charCodeAt(0) < 0x20 || char.charCodeAt(0) === 0x7f),
      "El nombre contiene caracteres no permitidos",
    ),
});

export type UpdateSellerNameInput = z.infer<typeof updateSellerNameSchema>;

/**
 * Body de `PUT /cloud-account/session` — Electron main empuja acá el JWT de cuenta cloud que
 * guarda cifrado (ver docs/monetization/ADS_CREDITS_GAMIFICATION.md §6); `null` lo borra
 * (logout). Nunca lo envía `apps/mobile`: el endpoint está detrás de `AdminDeviceGuard`, solo el
 * dispositivo admin (desktop) puede llamarlo.
 */
export const setCloudAccountSessionSchema = z.object({
  accessToken: z.string().min(1).nullable(),
});

export type SetCloudAccountSessionInput = z.infer<typeof setCloudAccountSessionSchema>;
