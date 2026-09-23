import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { adminUsers } from "./admin-users";
import { adPlacements } from "./ad-placements";

/** Historial append-only de `ad_placements` — mismo criterio que `credit_config_item_revisions`. */
export const adPlacementRevisions = pgTable("ad_placement_revisions", {
  id: uuid("id").primaryKey(),
  placementId: uuid("placement_id")
    .notNull()
    .references(() => adPlacements.id),
  previousAdNetwork: text("previous_ad_network").notNull(),
  newAdNetwork: text("new_ad_network").notNull(),
  previousAdUnitId: text("previous_ad_unit_id").notNull(),
  newAdUnitId: text("new_ad_unit_id").notNull(),
  previousEnabled: boolean("previous_enabled").notNull(),
  newEnabled: boolean("new_enabled").notNull(),
  note: text("note"),
  changedByAdminId: uuid("changed_by_admin_id")
    .notNull()
    .references(() => adminUsers.id),
  changedAt: timestamp("changed_at", { mode: "date" }).notNull(),
});
