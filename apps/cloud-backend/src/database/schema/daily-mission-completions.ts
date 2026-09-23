import { date, integer, pgEnum, pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * Catálogo de misiones diarias (doc §1/§2) — cuáles existen es código, no config; lo que sí es
 * config editable desde el panel admin (doc §7) es el crédito que otorgan y el tope diario.
 */
export const dailyMissionKeyEnum = pgEnum("daily_mission_key", [
  "register_3_sales",
  "update_5_products_stock",
]);

/**
 * Solo una misión activa por día (rotan), y el tope es 1 recompensa/día en total — por eso el
 * unique es `(userId, activityDate)`, no `(userId, missionKey, activityDate)`: `missionKey` queda
 * para saber cuál fue, no para permitir más de una por día.
 */
export const dailyMissionCompletions = pgTable(
  "daily_mission_completions",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    missionKey: dailyMissionKeyEnum("mission_key").notNull(),
    activityDate: date("activity_date", { mode: "string" }).notNull(),
    creditsAwarded: integer("credits_awarded").notNull(),
    completedAt: timestamp("completed_at", { mode: "date" }).notNull(),
  },
  (table) => [unique().on(table.userId, table.activityDate)],
);
