import { TRACKABLE_METRIC_KEYS, type TrackableMetricType } from "@stocknegozia/api-contracts";
import { date, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * Whitelist única de métricas trackeables — generada desde `TRACKABLE_METRIC_KEYS`
 * (`@stocknegozia/api-contracts/gamification/trackable-metrics`, revisada contra el código real de
 * `mobile-mini`), nunca duplicada acá a mano. Agregar una métrica nueva es cambiar esa lista +
 * generar una migración, no inventar un enum paralelo.
 */
export const activityMetricTypeEnum = pgEnum(
  "activity_metric_type",
  TRACKABLE_METRIC_KEYS as [TrackableMetricType, ...TrackableMetricType[]],
);

/**
 * Log de eventos de actividad individuales — reemplaza la idea de "contador que se incrementa" por
 * un evento por acción real, idempotente por `(userId, metricType, clientEventId)`. Esto es lo que
 * permite reintentar el mismo evento (ej. sincronizado tarde después de estar offline en
 * `mobile-mini`, ver `gamification_outbox` del lado cliente) sin duplicar el conteo. El progreso de
 * cualquier `achievement_definitions.category = 'scheduled_goal'` se calcula sumando `COUNT(*)`
 * acá, filtrado por `metricType` + rango de `occurredOn` según el `scheduleType` del logro — un
 * solo mecanismo de conteo reusado por cualquier período (día/semana/mes/fecha específica), nunca
 * una regla de conteo distinta por logro.
 */
export const activityEvents = pgTable(
  "activity_events",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    metricType: activityMetricTypeEnum("metric_type").notNull(),
    // Día calendario LOCAL del dispositivo cuando pasó el evento (no cuando llegó al server) — lo
    // manda el cliente para que un evento sincronizado tarde cuente en el período real en que
    // pasó, mismo criterio ya usado para "hoy" en el resto de gamification.
    occurredOn: date("occurred_on", { mode: "string" }).notNull(),
    clientEventId: text("client_event_id").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull(),
  },
  (table) => [unique().on(table.userId, table.metricType, table.clientEventId)],
);
