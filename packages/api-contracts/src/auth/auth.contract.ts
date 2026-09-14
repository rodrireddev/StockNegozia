export type DeviceType = "desktop" | "mobile" | "web";
export type DeviceStatus = "active" | "revoked";

/**
 * Respuesta de `POST /auth/bootstrap` — única vez que la API devuelve `credential` en texto
 * plano. El cliente debe persistirla de forma segura de inmediato (ver
 * `docs/security/API_ACCESS.md`); el backend nunca la vuelve a mostrar.
 */
export interface BootstrapResult {
  deviceId: string;
  credential: string;
}
