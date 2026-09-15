export type DeviceType = "desktop" | "mobile" | "tablet" | "web" | "other";
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

/**
 * Vista pública/administrativa de un `Device` — ver docs/security/DEVICE_MANAGEMENT.md. Nunca
 * incluye `credentialHash` ni ningún otro secreto; solo lo necesario para administrar el
 * dispositivo (listado, detalle, `/auth/devices/me`).
 */
export interface DeviceDto {
  id: string;
  name: string;
  type: DeviceType;
  active: boolean;
  isAdmin: boolean;
  createdAt: string;
  lastSeenAt: string | null;
}

export type PairingStatus = "pending" | "confirmed" | "expired" | "cancelled";

/**
 * Payload embebido en el QR — ver docs/security/PAIRING.md. Contiene el pairing token temporal,
 * nunca una credential permanente. `version` permite evolucionar el formato a futuro.
 */
export interface PairingQrPayload {
  version: 1;
  type: "stocknegozia-pairing";
  host: string;
  port: number;
  protocol: "http";
  pairingId: string;
  token: string;
  expiresAt: string;
}

/**
 * Respuesta de `POST /auth/pairing`. `verificationCode` se muestra en pantalla para que la
 * persona lo lea/tipee en el otro dispositivo — no viaja dentro del QR.
 */
export interface PairingCreateResult {
  pairingId: string;
  verificationCode: string;
  status: PairingStatus;
  expiresAt: string;
  qr: PairingQrPayload;
}

/**
 * Respuesta de `POST /auth/pairing/confirm` — igual que `BootstrapResult`, única vez que se
 * revela la credential del dispositivo recién emparejado.
 */
export interface PairingConfirmResult {
  device: { id: string; name: string; type: DeviceType };
  credential: string;
}

/**
 * Respuesta de `GET /auth/pairing/:id` — para que quien generó el QR sepa cuándo el otro
 * dispositivo confirmó, sin exponer nunca el token ni el código de verificación.
 */
export interface PairingStatusResult {
  pairingId: string;
  status: PairingStatus;
  expiresAt: string;
}
