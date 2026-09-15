import { useQuery } from "@tanstack/react-query";
import { getPairingStatus } from "../api/pairing.api";

const POLL_INTERVAL_MS = 2000;

/** Hace polling liviano mientras el pairing sigue `pending` — no hay WebSockets (ver M14). */
export function usePairingStatus(pairingId: string | undefined) {
  return useQuery({
    queryKey: ["pairing-status", pairingId],
    queryFn: () => getPairingStatus(pairingId!),
    enabled: pairingId !== undefined,
    refetchInterval: (query) => (query.state.data?.status === "pending" ? POLL_INTERVAL_MS : false),
  });
}
