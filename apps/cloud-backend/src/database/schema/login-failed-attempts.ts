import { index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

/**
 * Un fallo de login = una fila. Sirve para exigir Turnstile recién a partir del 5° fallo
 * consecutivo por IP (ventana deslizante de 15 min, ver `LoginAttemptsRepository`) en vez de en
 * cada login normal. Vive en Postgres (no en memoria) porque el proceso de `cloud-backend` puede
 * reiniciarse (Render free tier) y perder el contador justo cuando más importa.
 */
export const loginFailedAttempts = pgTable(
  "login_failed_attempts",
  {
    id: uuid("id").primaryKey(),
    ipAddress: varchar("ip_address", { length: 64 }).notNull(),
    failedAt: timestamp("failed_at", { mode: "date" }).notNull(),
  },
  (table) => ({
    ipFailedAtIdx: index("login_failed_attempts_ip_failed_at_idx").on(
      table.ipAddress,
      table.failedAt,
    ),
  }),
);
