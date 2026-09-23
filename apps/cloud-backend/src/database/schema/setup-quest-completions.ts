import { integer, pgEnum, pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * Quests de setup (doc §1): acciones que el usuario iba a hacer igual (primer producto, primera
 * venta, primer escaneo, perfil completo), premiadas una sola vez cada una.
 */
export const setupQuestKeyEnum = pgEnum("setup_quest_key", [
  "first_product",
  "first_sale",
  "first_scan",
  "profile_complete",
]);

export const setupQuestCompletions = pgTable(
  "setup_quest_completions",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    questKey: setupQuestKeyEnum("quest_key").notNull(),
    creditsAwarded: integer("credits_awarded").notNull(),
    completedAt: timestamp("completed_at", { mode: "date" }).notNull(),
  },
  (table) => [unique().on(table.userId, table.questKey)],
);
