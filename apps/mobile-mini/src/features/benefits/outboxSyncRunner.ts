import { claimSetupQuest, recordActivity } from "@/accounts/api/gamification.api";
import { gamificationOutboxRepository } from "./gamificationOutbox.repository";
import { getSyncDeviceId } from "./syncDeviceId";

let draining = false;

/**
 * Drena `gamification_outbox` en orden — se dispara al iniciar la app, al volver a foreground y al
 * reconectar red (ver `useOutboxSync.ts`), y también cada vez que `gamificationTriggers.ts` encola
 * algo nuevo (intento inmediato, no bloqueante). Nunca manda fuera de orden: si un evento falla
 * (sin red a mitad de camino), corta ahí y deja el resto para el próximo intento — así "al
 * conectarse, el estado pasa de anterior a actual" en el orden real en que pasó.
 *
 * `draining` evita que dos disparadores (ej. foreground + reconexión casi simultáneos) corran el
 * drenado en paralelo y reordenen o dupliquen requests en vuelo.
 */
export async function drainGamificationOutbox(): Promise<void> {
  if (draining) return;
  draining = true;

  try {
    const deviceId = await getSyncDeviceId();
    const pending = gamificationOutboxRepository.findUnsynced();

    for (const item of pending) {
      const clientEventId = `${deviceId}:${item.kind}:${item.id}`;
      try {
        if (item.kind === "activity") {
          await recordActivity(item.metricType!, clientEventId, item.occurredOn!);
        } else {
          await claimSetupQuest(item.questKey!);
        }
        gamificationOutboxRepository.markSynced(item.id);
      } catch {
        // Sin red o el server no respondió — se corta acá, el resto queda pendiente para el
        // próximo intento (nunca se salta un evento ni se reordena).
        break;
      }
    }
  } finally {
    draining = false;
  }
}
