import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/**
 * Sesión temporal de pairing (QR + código de verificación) — ver docs/security/PAIRING.md. Solo
 * se persisten hashes SHA-256 del pairing token y del verification code, nunca en texto plano
 * (mismo criterio que `devices.credential_hash`). `deviceId` queda `null` hasta que la sesión se
 * confirma y crea un `Device` — sirve para correlacionar logs y auditoría, no como referencia
 * activa (no hay FK: la sesión sigue teniendo valor histórico aunque el device se revoque después).
 */
export const pairingSessions = sqliteTable("pairing_sessions", {
  id: text("id").primaryKey(),
  tokenHash: text("token_hash").notNull(),
  verificationCodeHash: text("verification_code_hash").notNull(),
  status: text("status", { enum: ["pending", "confirmed", "expired", "cancelled"] })
    .notNull()
    .default("pending"),
  deviceId: text("device_id"),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  confirmedAt: integer("confirmed_at", { mode: "timestamp" }),
});
