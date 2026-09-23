import { pgEnum, pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * Los dos sinks "de suscripción" del doc §1 (backup en la nube, sacarse ads) — ambos se compran
 * por 30 días y se renuevan extendiendo `expiresAt`, no insertando una fila nueva por compra; por
 * eso `unique(userId, type)`: una sola fila viva por usuario y tipo de entitlement.
 */
export const entitlementTypeEnum = pgEnum("entitlement_type", ["cloud_backup", "remove_ads"]);

export const entitlements = pgTable(
  "entitlements",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    type: entitlementTypeEnum("type").notNull(),
    // Null = para siempre — el caso del Cofounder Pack (doc §1), que incluye backup y "sin ads"
    // de por vida sin gastar créditos.
    expiresAt: timestamp("expires_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull(),
  },
  (table) => [unique().on(table.userId, table.type)],
);
