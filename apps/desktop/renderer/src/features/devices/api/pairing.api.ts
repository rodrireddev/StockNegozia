import type {
  PairingCreateResult,
  PairingStatusResult,
} from "@stocknegozia/api-contracts";
import { apiGet, apiPost } from "@/lib/api-client";

export function createPairing(): Promise<PairingCreateResult> {
  return apiPost<PairingCreateResult>("/auth/pairing");
}

export function getPairingStatus(pairingId: string): Promise<PairingStatusResult> {
  return apiGet<PairingStatusResult>(`/auth/pairing/${pairingId}`);
}

export function cancelPairing(pairingId: string): Promise<{ ok: true }> {
  return apiPost<{ ok: true }>("/auth/pairing/cancel", { pairingId });
}
