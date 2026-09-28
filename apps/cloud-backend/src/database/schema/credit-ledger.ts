import { integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * Toda fuente/sink de créditos del doc §1, en un solo enum — nuevo sink o fuente = un valor nuevo
 * acá + una fila nueva, no una tabla nueva.
 */
export const creditReasonEnum = pgEnum("credit_reason", [
  "welcome_bonus",
  "setup_quest",
  "streak_milestone",
  "scheduled_goal",
  "rewarded_ad",
  "referral_bonus",
  "cofounder_grant",
  "export_report",
  "cloud_backup_subscription",
  "remove_ads_subscription",
  "feature_request_create",
  "feature_request_vote",
  "admin_adjustment",
]);

/**
 * Ledger append-only: nunca se actualiza ni borra una fila, cada movimiento (ganancia o gasto) es
 * una fila nueva. El saldo del usuario es la suma de `amount`, pero se cachea en `balanceAfter` en
 * cada fila para no tener que agregar toda la tabla en cada lectura.
 */
export const creditLedger = pgTable("credit_ledger", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  // Positivo = gana créditos, negativo = gasta.
  amount: integer("amount").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  reason: creditReasonEnum("reason").notNull(),
  // Detalle específico del reason (ej. qué quest, qué milestone, qué feature request) — sin esto
  // habría que agregar una columna nullable por cada reason posible.
  reasonMetadata: jsonb("reason_metadata").$type<Record<string, unknown>>(),
  // Clave de idempotencia para recompensas de una sola vez (ej. `welcome:<userId>`,
  // `quest:<userId>:<questKey>`) — evita otorgar el mismo crédito dos veces si un request se
  // reintenta. Nullable porque no todos los reasons son "de una vez" (ej. rewarded_ad se repite).
  idempotencyKey: text("idempotency_key").unique(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
});
