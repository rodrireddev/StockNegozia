import { index, integer, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * Una fila por vista de rewarded ad. El tope diario (3/día, doc §1) y el cooldown entre anuncios
 * se aplican a nivel de servicio contando filas de hoy — `sequenceInDay` (1/2/3) es lo que decide
 * la recompensa decreciente (3/2/1) sin tener que recalcularla contando en el momento del cobro.
 */
export const rewardedAdViews = pgTable(
  "rewarded_ad_views",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    sequenceInDay: integer("sequence_in_day").notNull(),
    creditsAwarded: integer("credits_awarded").notNull(),
    viewedAt: timestamp("viewed_at", { mode: "date" }).notNull(),
  },
  (table) => [index("rewarded_ad_views_user_viewed_at_idx").on(table.userId, table.viewedAt)],
);
