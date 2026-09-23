import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { creditLedger } from "./credit-ledger";
import { users } from "./users";

/**
 * Server-Side Verification (SSV) de AdMob: Google llama a un webhook de este backend con los
 * datos de una vista de rewarded ad completa, firmados con una clave que rota (se valida contra
 * las claves públicas que publica Google, no una acá). El objetivo es no confiar en el cliente
 * ("vi el anuncio, dame los créditos") — un cliente modificado podría mentir sobre eso.
 *
 * `transactionId` es la clave de idempotencia: Google puede reintentar el mismo callback (ej. si
 * la respuesta se pierde en la red), y acreditar dos veces por el mismo transaction_id sería un
 * bug de anti-abuso, justo lo que este mecanismo existe para evitar.
 */
export const adRewardCallbacks = pgTable("ad_reward_callbacks", {
  id: uuid("id").primaryKey(),
  transactionId: text("transaction_id").notNull().unique(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  // "admob" por ahora — el doc no contempla otras redes servidas por SSV todavía.
  adNetwork: text("ad_network").notNull().default("admob"),
  adUnit: text("ad_unit").notNull(),
  rewardItem: text("reward_item").notNull(),
  rewardAmount: integer("reward_amount").notNull(),
  verifiedAt: timestamp("verified_at", { mode: "date" }).notNull(),
  // Fila de `credit_ledger` que efectivamente acreditó este reward — null hasta que el servicio de
  // créditos (todavía no implementado) procese el callback.
  creditLedgerEntryId: uuid("credit_ledger_entry_id").references(() => creditLedger.id),
});
