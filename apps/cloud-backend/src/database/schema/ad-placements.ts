import { boolean, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { adminUsers } from "./admin-users";

/**
 * `mobile-mini` corre en android/ios (AdMob); `desktop` es Electron — AdMob y AdSense NO están
 * permitidos ahí por política de Google (ninguno de los dos autoriza "software application"),
 * así que ese lado usa un network de video ads distinto, todavía sin confirmar con el proveedor.
 */
export const adPlatformEnum = pgEnum("ad_platform", ["android", "ios", "desktop"]);

/**
 * Qué unidad/placement de qué red de ads usa cada plataforma (ej. "rewarded_credits" en
 * android/ios vía AdMob, "rewarded_credits" en desktop vía otro network) — un placement lógico
 * puede resolver a redes distintas según la plataforma. `adNetwork` es texto libre, no un enum
 * cerrado: qué red se usa en desktop todavía no está confirmado con el proveedor (ver doc
 * ADS_CREDITS_GAMIFICATION.md), y no debería hacer falta una migración de schema para cambiarlo.
 * `enabled` es un kill-switch: apagarlo hace que el cliente deje de pedir ese anuncio sin
 * necesitar un release nuevo. Mismo patrón de auditoría que `credit_config_items` (ver
 * `ad_placement_revisions`).
 */
export const adPlacements = pgTable(
  "ad_placements",
  {
    id: uuid("id").primaryKey(),
    key: text("key").notNull(),
    platform: adPlatformEnum("platform").notNull(),
    adNetwork: text("ad_network").notNull(),
    adUnitId: text("ad_unit_id").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
    updatedByAdminId: uuid("updated_by_admin_id").references(() => adminUsers.id),
  },
  (table) => [unique().on(table.key, table.platform)],
);
