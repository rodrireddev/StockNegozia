import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/**
 * Identidad persistente de un dispositivo autorizado a consumir la API en `API_ACCESS_MODE=production`
 * (ver docs/security/API_ACCESS.md). `credentialHash` es el único valor persistido de la credential —
 * nunca se guarda en texto plano (ver `CredentialService`).
 */
export const devices = sqliteTable("devices", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type", { enum: ["desktop", "mobile", "tablet", "web", "other"] }).notNull(),
  status: text("status", { enum: ["active", "revoked"] }).notNull().default("active"),
  credentialHash: text("credential_hash").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp" }),
});
