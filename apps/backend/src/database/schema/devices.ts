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
  status: text("status", { enum: ["active", "revoked"] })
    .notNull()
    .default("active"),
  credentialHash: text("credential_hash").notNull().unique(),
  /**
   * Distingue el dispositivo administrador (el creado por bootstrap) de los dispositivos cliente
   * (creados por pairing) — ver docs/security/DEVICE_MANAGEMENT.md §Quién puede administrar
   * dispositivos. No es un sistema de roles/permisos: es el mínimo necesario para que Device
   * Management no quede abierto a cualquier dispositivo autenticado.
   */
  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
  /**
   * Qué puede hacer el dispositivo con los datos del negocio (distinto de `isAdmin`, que solo
   * habilita administrar OTROS dispositivos): `cashier` vende y consulta, pero no ve finanzas,
   * no registra compras/ajustes de caja, no edita productos/precios ni cancela ventas — ver
   * `ManagerDeviceGuard`. Default `manager` para que los dispositivos existentes no pierdan acceso.
   */
  role: text("role", { enum: ["manager", "cashier"] })
    .notNull()
    .default("manager"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp" }),
  /**
   * Nombre de la persona que opera este dispositivo (ej. "Rodrigo"), distinto del nombre del
   * dispositivo en sí (ej. "Electron Desktop") — ver docs/inventory/STOCK_MOVEMENTS.md
   * §Trazabilidad. Solo tiene efecto en dispositivos `desktop`: reemplaza el nombre del
   * dispositivo en el snapshot `stock_movements.deviceName` de las ventas/compras/ajustes que
   * origine, para que el historial identifique al vendedor y no al equipo. Nullable: opcional
   * hasta que se configura desde `PATCH /auth/devices/me/seller-name`.
   */
  sellerName: text("seller_name"),
});
