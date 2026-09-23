import { z } from "zod";

export const cloudBackendEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CLOUD_BACKEND_PORT: z.coerce.number().int().positive().default(38200),
  DATABASE_URL: z.string().min(1),
  // Firma los JWT de sesión del panel de administración (doc §7) — nunca el mismo secreto que
  // ACCOUNT_JWT_SECRET (cuentas de comercio, doc §3).
  ADMIN_JWT_SECRET: z.string().min(32, "ADMIN_JWT_SECRET debe tener al menos 32 caracteres"),
  // Firma los JWT de sesión de las cuentas de comercio (`users`, doc §3) — separado de
  // ADMIN_JWT_SECRET a propósito: son dos sistemas de auth distintos (ver doc §7).
  ACCOUNT_JWT_SECRET: z.string().min(32, "ACCOUNT_JWT_SECRET debe tener al menos 32 caracteres"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  // Orígenes adicionales permitidos por CORS (panel de administración, futuros clientes), separados
  // por coma — mismo patrón que `backendEnvSchema.CORS_ALLOWED_ORIGINS`.
  CORS_ALLOWED_ORIGINS: z.string().optional(),
});

export type CloudBackendEnv = z.infer<typeof cloudBackendEnvSchema>;
