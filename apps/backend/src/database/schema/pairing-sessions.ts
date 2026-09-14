import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { devices } from "./devices";

/**
 * Sesión temporal de pairing (QR + código de verificación) — ver docs/security/PAIRING.md. Solo
 * se persisten hashes SHA-256 del pairing token y del verification code, nunca en texto plano
 * (mismo criterio que `devices.credential_hash`). `deviceId` queda `null` hasta que la sesión se
 * confirma y crea un `Device`.
 *
 * `deviceId` referencia `devices.id` (agregado en Milestone 7 — ver
 * docs/security/DEVICE_MANAGEMENT.md §`pairing_sessions.device_id`, pendiente documentado desde
 * Milestone 6). Se evaluó y se decidió agregar la FK: los devices nunca se eliminan físicamente
 * (solo se revocan, ver §Revocación permanente), así que la referencia nunca puede quedar
 * huérfana — la FK solo formaliza una invariante que ya existía, sin agregar restricciones nuevas
 * al flujo real (`onDelete` no se configura porque nunca hay un delete que dispare esa lógica).
 */
export const pairingSessions = sqliteTable("pairing_sessions", {
  id: text("id").primaryKey(),
  tokenHash: text("token_hash").notNull(),
  verificationCodeHash: text("verification_code_hash").notNull(),
  status: text("status", { enum: ["pending", "confirmed", "expired", "cancelled"] })
    .notNull()
    .default("pending"),
  deviceId: text("device_id").references(() => devices.id),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  confirmedAt: integer("confirmed_at", { mode: "timestamp" }),
});
