import { pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { houseAds } from "./house-ads";
import { users } from "./users";

/**
 * Una fila por vez que se mostró un house ad — la métrica mínima para que el panel admin (doc §7)
 * pueda mostrar "cuántas veces se mostró cada house ad" sin adivinar si vale la pena. `userId` es
 * nullable: mobile-mini funciona sin cuenta (doc principio rector), así que un house ad se puede
 * mostrar también a un usuario sin registrarse.
 */
export const houseAdImpressions = pgTable("house_ad_impressions", {
  id: uuid("id").primaryKey(),
  houseAdId: uuid("house_ad_id")
    .notNull()
    .references(() => houseAds.id),
  userId: uuid("user_id").references(() => users.id),
  shownAt: timestamp("shown_at", { mode: "date" }).notNull(),
});
