/**
 * Orígenes conocidos por defecto de los clientes propios — ver docs/lan/DEVICE_MANAGEMENT.md
 * §CORS. `CORS_ALLOWED_ORIGINS` (coma-separado) permite sumar otros sin tocar código (build
 * empaquetado del Desktop, un futuro Mobile).
 */
const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173", // renderer de Electron en dev (electron-vite)
  "http://localhost:5544", // Web Client en dev (puerto fijo, ver apps/web-client/vite.config.ts)
];

/** Web Client accedido desde otro dispositivo de la LAN por su IP (mismo puerto fijo 5544). */
const LAN_WEB_CLIENT_PATTERN = /^http:\/\/(\d{1,3}\.){3}\d{1,3}:5544$/;

export type CorsOriginCallback = (error: Error | null, allow?: boolean) => void;

/**
 * Esto es defensa en profundidad, no la barrera de seguridad real — esa sigue siendo
 * `ApiAccessGuard`/`API_ACCESS_MODE` (ver docs/lan/LAN_TESTING.md §CORS). Un request sin `Origin`
 * (clientes no-browser: curl, apps nativas) no pasa por CORS de todos modos, así que se permite
 * directamente.
 */
export function createCorsOriginValidator(
  extraOrigins: string[] = [],
): (origin: string | undefined, callback: CorsOriginCallback) => void {
  const allowedOrigins = new Set([...DEFAULT_ALLOWED_ORIGINS, ...extraOrigins]);

  return (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) return callback(null, true);
    if (LAN_WEB_CLIENT_PATTERN.test(origin)) return callback(null, true);
    callback(new Error(`Origin not allowed by CORS: ${origin}`), false);
  };
}
