import { z } from "zod";

export const cloudBackendEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CLOUD_BACKEND_PORT: z.coerce.number().int().positive().default(38200),
  // Render (y la mayoría de los PaaS) inyectan su propio `PORT` y esperan que el proceso escuche
  // ahí — si existe, gana sobre `CLOUD_BACKEND_PORT` (ver `configuration.ts`). En local/Docker no
  // suele estar seteada, así que el default de arriba sigue aplicando sin cambios.
  PORT: z.coerce.number().int().positive().optional(),
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
  // Proveedor de email real (Resend) — opcional a propósito: sin esto, `EmailService` sigue
  // logueando en vez de mandar (mismo comportamiento que siempre tuvo en dev, doc
  // ADS_CREDITS_GAMIFICATION.md §3). Conectar Resend de verdad es solo setear esta variable.
  RESEND_API_KEY: z.string().optional(),
  // `onboarding@resend.dev` (el remitente de prueba de Resend, funciona sin verificar dominio
  // propio) hasta que haya un dominio real verificado en Resend.
  RESEND_FROM_EMAIL: z.string().default("StockNegozia <onboarding@resend.dev>"),
});

export type CloudBackendEnv = z.infer<typeof cloudBackendEnvSchema>;
