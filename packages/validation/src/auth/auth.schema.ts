import { z } from "zod";

/**
 * Body de `POST /auth/bootstrap`. El `token` es el secreto de instalación de un solo uso
 * (archivo `bootstrap.token`, ver `BootstrapTokenService`) — no es la credential permanente del
 * dispositivo.
 */
export const bootstrapSchema = z.object({
  token: z.string({ required_error: "El token de bootstrap es obligatorio" }).min(16),
  name: z.string().trim().min(1).max(100).optional(),
  type: z.enum(["desktop", "mobile", "web"]).optional(),
});

export type BootstrapInput = z.infer<typeof bootstrapSchema>;
