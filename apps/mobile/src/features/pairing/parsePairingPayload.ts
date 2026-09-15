import type { PairingQrPayload } from "@stocknegozia/api-contracts";

export interface ParsedPairingPayload {
  pairingId: string;
  token: string;
  /** `${protocol}://${host}:${port}` — para configurar el backend automáticamente, sin que la
   * persona tenga que escribir ninguna IP a mano (ver docs/mobile/MOBILE_CLIENT.md §Configuración). */
  backendUrl: string;
}

/**
 * Parsea el JSON contenido en el QR (`PairingQrPayload`) leído por la cámara — ver
 * `src/features/pairing/components/steps/ScanStep.tsx`. Chequea `version` explícitamente (ver
 * docs/security/PAIRING.md §Crear un pairing) — no asume campos de un formato futuro sin
 * validarlo primero.
 *
 * A diferencia de M15 (donde `host`/`port` del payload se ignoraban y la persona escribía la URL
 * del backend a mano, igual que `apps/web-client/src/pairing.ts`), acá sí se usan: el QR ya trae
 * la dirección LAN exacta que el backend resolvió (`resolveLanHost()`), así que no hay ninguna
 * razón para pedírsela a la persona — es un detalle interno, no algo que el usuario del celular
 * tenga que conocer.
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
  if (typeof candidate.host !== "string" || candidate.host.length === 0) return null;
  if (typeof candidate.port !== "number" || !Number.isInteger(candidate.port)) return null;
  if (candidate.protocol !== "http") return null;

  return {
    pairingId: candidate.pairingId,
    token: candidate.token,
    backendUrl: `${candidate.protocol}://${candidate.host}:${candidate.port}`,
  };
}
