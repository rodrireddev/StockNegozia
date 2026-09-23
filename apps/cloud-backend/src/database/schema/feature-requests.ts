import { integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * "en_evaluation" es señal de prioridad, no una promesa de desarrollo (doc §4) — la etiqueta
 * existe para poder mostrarla tal cual en el tablero público y evitar reclamos.
 */
export const featureRequestStatusEnum = pgEnum("feature_request_status", [
  "submitted",
  "in_evaluation",
  "planned",
  "done",
  "declined",
]);

/**
 * Tablero de pedidos de features (doc §4) — Etapa 2, no se activa hasta cumplir el criterio de
 * salida de Etapa 1 (doc §5: ~50-100 comercios activos con feedback espontáneo). Se define el
 * schema ahora junto con el resto de entidades porque el costo es bajo; el módulo NestJS
 * (controller/service, lógica de voto ponderado) se implementa cuando se active la etapa.
 */
export const featureRequests = pgTable("feature_requests", {
  id: uuid("id").primaryKey(),
  createdByUserId: uuid("created_by_user_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: featureRequestStatusEnum("status").notNull().default("submitted"),
  creditsSpentToCreate: integer("credits_spent_to_create").notNull(),
  // Suma de `feature_votes.weight` para este pedido — cacheado para no agregar la tabla de votos
  // en cada lectura del tablero (se recalcula al insertar un voto).
  totalVoteWeight: integer("total_vote_weight").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
});
