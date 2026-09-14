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
});

export type BackendEnv = z.infer<typeof backendEnvSchema>;
