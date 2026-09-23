import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { adminUsers } from "./admin-users";
import { creditConfigItems } from "./credit-config-items";

/**
 * Historial append-only por ítem de config (doc §7: "ver qué cambió, cuándo, y poder revertir si
 * un ajuste sale mal") — separado de `creditConfigItems` porque el ítem en sí solo necesita el
 * valor vigente; quién lo cambió y cuándo vive acá, por ítem, no como snapshot de toda la tabla.
 * Revertir es aplicar `previousValue` como un update nuevo (que genera su propia revisión), nunca
 * un UPDATE/DELETE sobre una fila existente de esta tabla.
 */
export const creditConfigItemRevisions = pgTable("credit_config_item_revisions", {
  id: uuid("id").primaryKey(),
  itemId: uuid("item_id")
    .notNull()
    .references(() => creditConfigItems.id),
  previousValue: integer("previous_value").notNull(),
  newValue: integer("new_value").notNull(),
  note: text("note"),
  changedByAdminId: uuid("changed_by_admin_id")
    .notNull()
    .references(() => adminUsers.id),
  changedAt: timestamp("changed_at", { mode: "date" }).notNull(),
});
