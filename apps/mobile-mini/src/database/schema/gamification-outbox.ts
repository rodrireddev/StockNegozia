import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

/**
 * Cola local durable de eventos de gamification pendientes de sincronizar con `cloud-backend` —
 * reemplaza el POST directo fire-and-forget que había antes (`gamificationTriggers.ts`, se perdía
 * para siempre si no había red). La app tiene que seguir funcionando 100% offline: encolar acá es
 * una operación local que nunca falla, y un `outboxSyncRunner` aparte drena esto en orden apenas
 * hay red — "al conectarse, actualiza el estado de anterior al actual".
 *
 * `metricType`/`questKey` son mutuamente excluyentes según `kind` (validado en
 * `gamificationTriggers.ts`, no acá — SQLite no tiene un `CHECK` cómodo para esto vía Drizzle).
 * `occurredOn` (solo `kind = 'activity'`) es el día calendario LOCAL en que pasó la acción, no
 * cuando se sincroniza — importa para que un objetivo diario/semanal/mensual cuente el evento en el
 * período real en que ocurrió.
 */
export const gamificationOutbox = sqliteTable(
  "gamification_outbox",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    kind: text("kind", { enum: ["activity", "setup_quest_claim"] }).notNull(),
    metricType: text("metric_type"),
    questKey: text("quest_key"),
    occurredOn: text("occurred_on"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    syncedAt: integer("synced_at", { mode: "timestamp" }),
  },
  (table) => ({
    syncedAtIdx: index("gamification_outbox_synced_at_idx").on(table.syncedAt),
  }),
);
