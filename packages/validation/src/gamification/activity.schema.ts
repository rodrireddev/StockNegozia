import { TRACKABLE_METRIC_KEYS, type TrackableMetricType } from "@stocknegozia/api-contracts";
import { z } from "zod";

/**
 * Body de `POST /gamification/activity`. Todo ping de actividad está ligado a una de las métricas
 * de la whitelist (`TRACKABLE_METRIC_KEYS`) — no existe más un ping "solo racha" sin metadata.
 * `clientEventId` es lo que hace el evento idempotente (reintentar el mismo evento offline, ver
 * `gamification_outbox` en `mobile-mini`, nunca duplica el conteo ni la racha). `occurredOn` es
 * opcional (día calendario LOCAL del dispositivo cuando pasó, no cuando se sincronizó) — default
 * server-side es "hoy" si no viene, para que un evento sincronizado tarde (offline) cuente en el
 * período real en que pasó.
 */
export const recordActivitySchema = z.object({
  metricType: z.enum(TRACKABLE_METRIC_KEYS as [TrackableMetricType, ...TrackableMetricType[]]),
  clientEventId: z.string().trim().min(1).max(200),
  occurredOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export type RecordActivityInput = z.infer<typeof recordActivitySchema>;
