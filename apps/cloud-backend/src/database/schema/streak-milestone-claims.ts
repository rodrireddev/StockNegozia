import { integer, pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * Un hito de racha (día 3/7/14/30, doc §1) reclamado una sola vez por usuario. Existe separada de
 * `users.currentStreak` porque lo que hay que impedir es reotorgar el mismo hito, no solo llevar
 * la cuenta de la racha actual.
 */
export const streakMilestoneClaims = pgTable(
  "streak_milestone_claims",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    milestoneDay: integer("milestone_day").notNull(),
    creditsAwarded: integer("credits_awarded").notNull(),
    claimedAt: timestamp("claimed_at", { mode: "date" }).notNull(),
  },
  (table) => [unique().on(table.userId, table.milestoneDay)],
);
