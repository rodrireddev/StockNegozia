import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Auth del panel de administración (doc §7) — separado a propósito de `users` (las cuentas de los
 * comercios): "protegido con su propio auth de admin, no el mismo login que usan los comercios".
 */
export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
});
