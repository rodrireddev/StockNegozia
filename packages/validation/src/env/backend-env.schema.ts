import { z } from "zod";

/**
 * `z.coerce.boolean()` haría `Boolean("false") === true` (cualquier string no vacío es truthy),
 * así que las variables booleanas se parsean explícitamente contra "true"/"false".
 */
const booleanEnvFlag = (defaultValue: boolean) =>
  z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? defaultValue : value === "true"));

export const backendEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  STOCKNEGOZIA_PORT: z.coerce.number().int().positive().default(38123),
  STOCKNEGOZIA_DATA_DIR: z.string().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  LOG_DIR: z.string().optional(),
  LOG_PERSISTENCE: booleanEnvFlag(true),
  LOG_CONSOLE: booleanEnvFlag(true),
  // "development" = endpoints abiertos (browser, Postman, Electron) sin credential, para no
  // interrumpir el flujo de desarrollo. "production" = todo endpoint no marcado @Public() exige
  // `Authorization: Bearer <credential>` de un dispositivo activo — ver docs/security/API_ACCESS.md.
  API_ACCESS_MODE: z.enum(["development", "production"]).default("development"),
  // Duración de una sesión de pairing (QR + código) antes de expirar — ver docs/security/PAIRING.md.
  PAIRING_EXPIRATION_MINUTES: z.coerce.number().int().positive().default(5),
  // Override manual del host que se embebe en el QR para que otro dispositivo en la misma LAN
  // pueda llegar al backend (localhost no sirve desde otro dispositivo). Sin esta variable, se
  // intenta autodetectar la primera IP de LAN no interna — ver `resolveLanHost`.
  PAIRING_HOST: z.string().optional(),
  // Orígenes adicionales permitidos por CORS, separados por coma (ej. el build empaquetado del
  // Desktop, un futuro cliente Mobile) — se suman a los orígenes conocidos por defecto (renderer de
  // Electron en dev, Web Client en dev/LAN). Ver docs/lan/DEVICE_MANAGEMENT.md §CORS.
  CORS_ALLOWED_ORIGINS: z.string().optional(),
  // URL de apps/cloud-backend (backend multi-tenant de cuentas/créditos, distinto de este) — usada
  // solo por el proxy `cloud-account` (ver docs/monetization/ADS_CREDITS_GAMIFICATION.md §6), que
  // reenvía ahí los requests de `apps/mobile` con el JWT que Electron main le empuja.
  CLOUD_BACKEND_URL: z.string().url().default("http://localhost:38200"),
});

export type BackendEnv = z.infer<typeof backendEnvSchema>;
