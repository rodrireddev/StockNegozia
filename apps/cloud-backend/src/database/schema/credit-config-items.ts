import { integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { adminUsers } from "./admin-users";

/**
 * Espeja la separación fuentes/sinks del doc §1 — el panel admin (doc §7) agrupa por esto en la
 * tabla editable.
 */
export const creditConfigItemCategoryEnum = pgEnum("credit_config_item_category", [
  "source",
  "sink",
]);

/**
 * Unidad de `value` — la mayoría de los ítems son montos en créditos, pero la misma tabla también
 * cubre topes y cooldowns (doc §7: "créditos por ads/misión/racha/referido, precios de cada sink,
 * topes diarios y cooldowns"), que están en otras unidades. El período de un tope ("por día",
 * "por mes") no es parte de la unidad — queda en `label`/`key` (ej. "cap.referral_max_per_month")
 * para no tener que enumerar cada combinación posible acá. Solo afecta cómo el panel formatea el
 * número, no la lógica de negocio.
 */
export const creditConfigItemUnitEnum = pgEnum("credit_config_item_unit", [
  "credits",
  "count",
  "minutes",
  "days",
]);

/**
 * Una fila por feature/costo balanceable desde el panel (doc §7) — ej. "Exportar reporte: 10
 * créditos", "Backup 30 días: 160 créditos", "Tope de rewarded ads: 3/día". `key` es texto libre
 * (no enum) a propósito: agregar un ítem nuevo es un INSERT, no una migración de schema — mantiene
 * la idea de "ajustar sin tocar código y redeployar" también para sumar un ítem, no solo para
 * cambiar un valor existente.
 */
export const creditConfigItems = pgTable("credit_config_items", {
  id: uuid("id").primaryKey(),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  description: text("description"),
  category: creditConfigItemCategoryEnum("category").notNull(),
  unit: creditConfigItemUnitEnum("unit").notNull().default("credits"),
  value: integer("value").notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
  updatedByAdminId: uuid("updated_by_admin_id").references(() => adminUsers.id),
});
