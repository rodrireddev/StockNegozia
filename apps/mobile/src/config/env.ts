/**
 * Separación dev/preview/production — ver docs/mobile/MOBILE_CLIENT.md §Configuración.
 *
 * A diferencia del Web Client (`VITE_API_URL`, fijo al momento del build porque el dev server
 * corre en la misma LAN que se está probando), Mobile no puede resolver la IP del backend en
 * build-time para producción: cada instalación de StockNegozia corre en una LAN distinta, sin
 * descubrimiento de red (ver docs/security/PAIRING.md §Host/red). Por eso:
 *
 * - `EXPO_PUBLIC_API_URL` es solo una conveniencia de desarrollo (leída una vez al iniciar
 *   `expo start`, ver `.env.example`) — nunca la fuente de verdad para preview/production.
 * - La fuente de verdad real es la URL guardada en el dispositivo (`backend-url-store.ts`),
 *   editable desde la pantalla de pairing — igual que la persona ya tiene que escribir la IP LAN
 *   a mano en `apps/web-client/.env` durante desarrollo, acá la escribe una vez en la app.
 */
export type AppEnv = "development" | "preview" | "production";

/** `expo-constants`/`process.env.EXPO_PUBLIC_*` distinguen el canal por `releaseChannel`/`__DEV__`. */
export function resolveAppEnv(): AppEnv {
  if (__DEV__) return "development";
  return "production";
}

/** Solo usado como valor por defecto sugerido en desarrollo — nunca hardcodeado como IP de producción. */
export function getDefaultDevApiUrl(): string | null {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  return configured && configured.length > 0 ? configured : null;
}
