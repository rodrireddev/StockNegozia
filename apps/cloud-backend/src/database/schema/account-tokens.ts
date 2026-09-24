import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * Un solo enum de propósito en vez de dos tablas separadas — confirmación de email y reset de
 * contraseña son el mismo patrón (token de un solo uso, con vencimiento, mandado por mail),
 * distinto solo en qué hace al consumirse.
 */
export const accountTokenPurposeEnum = pgEnum("account_token_purpose", [
  "email_verification",
  "password_reset",
]);

/**
 * Nunca se persiste el token en texto plano — mismo criterio que `credentialHash` en
 * `apps/backend` (`CredentialService`): lo único que viaja en el link/código del mail es el
 * token crudo, de alta entropía, generado por el servidor; acá solo se guarda su hash SHA-256.
 * `consumedAt` marca que ya se usó — un token consumido nunca es válido de nuevo, aunque no haya
 * vencido. Pedir un token nuevo del mismo `purpose` invalida (consume) cualquier token anterior sin
 * usar del mismo usuario — nunca hay más de un token vivo por propósito y usuario.
 */
export const accountTokens = pgTable("account_tokens", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  purpose: accountTokenPurposeEnum("purpose").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  consumedAt: timestamp("consumed_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
});
