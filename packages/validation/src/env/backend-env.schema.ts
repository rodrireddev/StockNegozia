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

const IPV4_OCTET = "(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)";
const IPV4 = new RegExp(`^${IPV4_OCTET}(?:\\.${IPV4_OCTET}){3}$`);
const HOSTNAME =
  /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i;

/** IPv4 válida, o hostname que no sea "casi una IP" (ej. `999.1.1.1`). */
function isLanHost(host: string): boolean {
  if (/^[\d.]+$/.test(host)) return IPV4.test(host);
  return HOSTNAME.test(host);
}

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
  // Solo IPv4 o hostname, sin protocolo/puerto/espacios: se embebe tal cual en `http://<host>:<puerto>`
  // del QR, y un valor mal escrito generaría un QR que apunta a ningún lado sin ningún aviso.
  // `localhost`/loopback no sirven desde otro dispositivo (ver docs/security/PAIRING.md §Host/red).
  PAIRING_HOST: z
    .string()
    .trim()
    .refine(isLanHost, {
      message:
        "PAIRING_HOST debe ser una IPv4 (ej. 192.168.0.10) o un hostname, sin http:// ni puerto",
    })
    .refine((host) => host.toLowerCase() !== "localhost" && !host.startsWith("127."), {
      message: "PAIRING_HOST no puede ser localhost/127.x: otro dispositivo no llegaría al backend",
    })
    .optional(),
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
