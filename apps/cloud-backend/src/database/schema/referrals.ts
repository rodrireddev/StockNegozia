import { integer, pgEnum, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * "Éxito" (doc §1/§5) = actividad real del invitado en su primera semana, no la sola instalación
 * — por eso `pending` existe como estado intermedio entre "se registró con este código" y
 * "validado, otorgar créditos a ambos". `expired` cubre al invitado que nunca tuvo esa actividad.
 */
export const referralStatusEnum = pgEnum("referral_status", ["pending", "validated", "expired"]);

export const referrals = pgTable("referrals", {
  id: uuid("id").primaryKey(),
  referrerUserId: uuid("referrer_user_id")
    .notNull()
    .references(() => users.id),
  // Un usuario solo puede haber sido referido una vez.
  referredUserId: uuid("referred_user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  status: referralStatusEnum("status").notNull().default("pending"),
  creditsAwardedReferrer: integer("credits_awarded_referrer"),
  creditsAwardedReferred: integer("credits_awarded_referred"),
  validatedAt: timestamp("validated_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
});
