import type { PairingQrPayload } from "@stocknegozia/api-contracts";

export interface ParsedPairingPayload {
  pairingId: string;
  token: string;
}

/**
 * Parsea el JSON del QR (`PairingQrPayload`) que la persona copia desde el Desktop y pega acá.
 * El scanner de cámara NO se implementa en M15 (ver docs/mobile/MOBILE_CLIENT.md §Scanner) — esta
 * pantalla usa el mismo mecanismo de "pegar el JSON" que ya probó `apps/web-client/src/pairing.ts`
 * en M14. Solo se necesitan `pairingId`/`token` para confirmar; `host`/`port`/`expiresAt` del
 * payload no se usan acá (la URL del backend la configura la persona por separado, ver
 * `src/config/backendUrlStore.ts`).
 *
 * Chequea `version` explícitamente (ver docs/security/PAIRING.md §Crear un pairing) — no asume
 * campos de un formato futuro sin validarlo primero.
 */
export function parsePairingPayload(raw: string): ParsedPairingPayload | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const candidate = parsed as Partial<PairingQrPayload>;

  if (candidate.version !== 1) return null;
  if (typeof candidate.pairingId !== "string" || candidate.pairingId.length === 0) return null;
  if (typeof candidate.token !== "string" || candidate.token.length === 0) return null;

  return { pairingId: candidate.pairingId, token: candidate.token };
}
