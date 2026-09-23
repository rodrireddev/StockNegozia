import { boolean, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { adminUsers } from "./admin-users";

/**
 * Catálogo de anuncios propios ("house ads"), administrado desde el panel — se muestran cuando
 * AdMob no tiene inventario para el placement ("no fill"), en vez de no mostrar nada. Pensado para
 * promocionar algo propio (ej. el Cofounder Pack, doc §1), no para vender espacio a terceros.
 * `priority` desempata cuando hay más de un house ad activo (mayor primero); el cliente no
 * necesita saber el orden de negocio, solo pide "el house ad de mayor prioridad activo".
 */
export const houseAds = pgTable("house_ads", {
  id: uuid("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body"),
  imageUrl: text("image_url"),
  ctaLabel: text("cta_label").notNull(),
  ctaUrl: text("cta_url").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  priority: integer("priority").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
  updatedByAdminId: uuid("updated_by_admin_id").references(() => adminUsers.id),
});
