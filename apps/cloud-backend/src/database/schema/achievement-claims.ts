import { integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";
import { achievementDefinitions } from "./achievement-definitions";

/**
 * Reemplaza `setup_quest_completions`/`streak_milestone_claims`/`daily_mission_completions` —
 * una sola tabla de reclamos para cualquier categoría de logro. `periodKey` es lo que distingue un
 * período de otro dentro del mismo logro: `"once"` (setup quests), `"streak"` (hitos de racha —
 * un hito de racha ya es único por definición, no repite período), `"YYYY-MM-DD"` (daily o
 * specific_date), `"YYYY-Www"` (weekly, semana ISO), `"YYYY-MM"` (monthly). El `unique` de abajo es
 * la idempotencia real: no importa cuántas veces se reevalúe un logro dentro del mismo período,
 * solo se acredita una vez — mismo criterio que ya usaba cada tabla vieja por separado.
 */
export const achievementClaims = pgTable(
  "achievement_claims",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    achievementDefinitionId: uuid("achievement_definition_id")
      .notNull()
      .references(() => achievementDefinitions.id),
    periodKey: text("period_key").notNull(),
    creditsAwarded: integer("credits_awarded").notNull(),
    claimedAt: timestamp("claimed_at", { mode: "date" }).notNull(),
  },
  (table) => [unique().on(table.userId, table.achievementDefinitionId, table.periodKey)],
);
