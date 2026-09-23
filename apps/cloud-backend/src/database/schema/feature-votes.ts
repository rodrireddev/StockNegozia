import { integer, pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { featureRequests } from "./feature-requests";
import { users } from "./users";

/**
 * Un voto/boost de un usuario a un pedido existente (doc §4). `voteNumber` (1..6 del mismo usuario
 * en el mismo pedido) es lo que dirige el retorno decreciente desde el 3er voto; `weight` es el
 * peso real sumado a `featureRequests.totalVoteWeight` — los Cofounders votan con peso reforzado
 * (doc §1, Cofounder Pack), el resto vota con peso 1.
 */
export const featureVotes = pgTable(
  "feature_votes",
  {
    id: uuid("id").primaryKey(),
    featureRequestId: uuid("feature_request_id")
      .notNull()
      .references(() => featureRequests.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    voteNumber: integer("vote_number").notNull(),
    creditsSpent: integer("credits_spent").notNull(),
    weight: integer("weight").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull(),
  },
  (table) => [unique().on(table.featureRequestId, table.userId, table.voteNumber)],
);
