export interface ParsedPairingPayload {
  pairingId: string;
  token: string;
}

/**
 * Parsea el JSON del QR (`PairingQrPayload`) que la persona copia desde el Desktop y pega acá —
 * este cliente de prueba no escanea la cámara (ver docs/lan/DEVICE_MANAGEMENT.md §Pairing). Solo
 * se necesitan `pairingId`/`token` para confirmar; el resto del payload (host/port/expiresAt) no
 * se usa acá.
 */
export function parsePairingPayload(raw: string): ParsedPairingPayload | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const { pairingId, token } = parsed as Record<string, unknown>;
  if (typeof pairingId !== "string" || pairingId.length === 0) return null;
  if (typeof token !== "string" || token.length === 0) return null;

  return { pairingId, token };
}
