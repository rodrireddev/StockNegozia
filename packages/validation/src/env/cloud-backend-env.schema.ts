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
  // Proveedor de email real: API REST de Gmail por HTTPS (OAuth2) — no SMTP, no Resend/SendGrid.
  // Opcional a propósito: sin esto, `EmailService` sigue logueando en vez de mandar (mismo
  // comportamiento que siempre tuvo en dev, doc ADS_CREDITS_GAMIFICATION.md §3). El SMTP real de
  // Gmail (probado antes que esto) queda bloqueado por Render en el plan free (puertos 25/465/587,
  // ver el changelog de Render sobre esto) — la API REST usa el puerto 443 (HTTPS normal), que
  // nunca se bloquea, y el mensaje sigue saliendo genuinamente de la infraestructura de Google
  // (mismo motivo original: Resend/SendGrid no pueden alinear SPF/DKIM para un remitente @gmail.com
  // sin dominio propio, y eso caía a spam).
  GMAIL_USER: z.string().optional(),
  // Credenciales OAuth2 de un proyecto de Google Cloud (console.cloud.google.com) con la Gmail API
  // habilitada — `GMAIL_REFRESH_TOKEN` se consigue una sola vez hacienda el consentimiento OAuth
  // con scope `https://www.googleapis.com/auth/gmail.send` para la cuenta de `GMAIL_USER`.
  GMAIL_CLIENT_ID: z.string().optional(),
  GMAIL_CLIENT_SECRET: z.string().optional(),
  GMAIL_REFRESH_TOKEN: z.string().optional(),
});

export type CloudBackendEnv = z.infer<typeof cloudBackendEnvSchema>;
