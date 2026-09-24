import { boolean, date, integer, pgEnum, pgTable, text, timestamp, uuid, type AnyPgColumn } from "drizzle-orm/pg-core";

/**
 * Bronce/Plata/Oro/Pro (doc §2). Denormalizado acá para lecturas baratas — se recalcula desde el
 * servicio de gamification cuando cambian las señales que lo determinan (ventas, racha), no es
 * config editable directamente. "pro" también es el nivel que reciben los Cofounders desde el
 * día uno (doc §1, Cofounder Pack).
 */
export const userLevelEnum = pgEnum("user_level", ["bronze", "silver", "gold", "pro"]);

/**
 * Cuenta opcional (doc §3) — la app funciona 100% sin esto. Un registro acá solo existe una vez
 * que el usuario decide crear cuenta (o fue invitado por un referido).
 *
 * `email`/`phone` son ambos nullable a propósito: el mecanismo de auth (email+password vs.
 * teléfono/OTP para LatAm) todavía es una decisión pendiente (doc §3) — se exige "al menos uno de
 * los dos" a nivel de servicio, no con una constraint de DB.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").unique(),
  phone: text("phone").unique(),
  displayName: text("display_name"),
  passwordHash: text("password_hash"),
  // `null` = todavía no confirmó el email (ver `account_tokens`, purpose "email_verification").
  // No bloquea nada de la app — doc "nunca bloquea nada, en ningún nivel" — es solo informativo
  // para el usuario y para anti-abuso (ej. antes de habilitar notificaciones por mail).
  emailVerifiedAt: timestamp("email_verified_at", { mode: "date" }),

  level: userLevelEnum("level").notNull().default("bronze"),

  // Racha de uso diario (doc §2) — abrir la app y hacer algo real (venta o movimiento de stock),
  // no de mirar ads. Los hitos (día 3/7/14/30) se registran aparte en `streak_milestone_claims`
  // para no perder el historial de cuándo se reclamó cada uno.
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastActiveDate: date("last_active_date", { mode: "string" }),

  referralCode: text("referral_code").notNull().unique(),
  referredByUserId: uuid("referred_by_user_id").references((): AnyPgColumn => users.id),

  // Cofounder Pack (doc §1) — pago único, cupo de 100, no reabre. `cofounderNumber` es el puesto
  // en la cola (1..100): existir es lo que hace el cupo verificable (contar filas no-null) en vez
  // de confiar en un contador externo.
  isCofounder: boolean("is_cofounder").notNull().default(false),
  cofounderNumber: integer("cofounder_number").unique(),

  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
});
