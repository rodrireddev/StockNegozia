import type { DeviceDto, DeviceType, PairingConfirmResult } from "@stocknegozia/api-contracts";
import { apiGet, apiPost } from "@/api/client";
import { AuthRequiredError } from "@/api/errors";

export interface ConfirmPairingInput {
  pairingId: string;
  token: string;
  verificationCode: string;
  deviceName?: string;
  /** `mobile` o `tablet` — el mismo enum de `devices.type`, ver el heurístico de ancho de pantalla en `useDeviceSize`. */
  deviceType: Extract<DeviceType, "mobile" | "tablet">;
}

/**
 * `POST /auth/pairing/confirm` — endpoint `@Public()`, ver docs/security/PAIRING.md §3. Un 401
 * acá no significa "este dispositivo perdió autorización" (todavía no tenía ninguna) sino "el
 * token/código/pairing están mal o vencieron" — mismo criterio que `apps/web-client/src/api.ts`.
 */
export async function confirmPairing(input: ConfirmPairingInput): Promise<PairingConfirmResult> {
  try {
    return await apiPost<PairingConfirmResult>("/auth/pairing/confirm", input);
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      throw new Error("No se pudo emparejar: código o datos incorrectos, o el pairing expiró.");
    }
    throw error;
  }
}

/** `GET /auth/devices/me` — dispara `AuthRequiredError` si la credential ya no es válida. */
export function getMe(): Promise<DeviceDto> {
  return apiGet<DeviceDto>("/auth/devices/me");
}
