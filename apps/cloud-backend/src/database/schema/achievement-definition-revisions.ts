import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { adminUsers } from "./admin-users";
import { achievementDefinitions, achievementScheduleTypeEnum } from "./achievement-definitions";

/**
 * Historial append-only de `achievement_definitions` — mismo patrón que
 * `credit_config_item_revisions`/`ad_placement_revisions`: una fila por cambio, `previous*`/`new*`
 * de cada campo editable. Solo cubre los campos que el panel puede editar (`key`/`category`/
 * `metricType` son inmutables, ver comentario en `achievement-definitions.ts`).
 */
export const achievementDefinitionRevisions = pgTable("achievement_definition_revisions", {
  id: uuid("id").primaryKey(),
  achievementDefinitionId: uuid("achievement_definition_id")
    .notNull()
    .references(() => achievementDefinitions.id),
  previousLabel: text("previous_label").notNull(),
  newLabel: text("new_label").notNull(),
  previousDescription: text("previous_description"),
  newDescription: text("new_description"),
  previousTarget: integer("previous_target"),
  newTarget: integer("new_target"),
  previousScheduleType: achievementScheduleTypeEnum("previous_schedule_type").notNull(),
  newScheduleType: achievementScheduleTypeEnum("new_schedule_type").notNull(),
  previousScheduleConfig: jsonb("previous_schedule_config").$type<{ date: string }>(),
  newScheduleConfig: jsonb("new_schedule_config").$type<{ date: string }>(),
  previousCreditsAwarded: integer("previous_credits_awarded").notNull(),
  newCreditsAwarded: integer("new_credits_awarded").notNull(),
  previousActive: boolean("previous_active").notNull(),
  newActive: boolean("new_active").notNull(),
  note: text("note"),
  changedByAdminId: uuid("changed_by_admin_id")
    .notNull()
    .references(() => adminUsers.id),
  changedAt: timestamp("changed_at", { mode: "date" }).notNull(),
});
