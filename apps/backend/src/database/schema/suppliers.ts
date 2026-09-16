import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const suppliers = sqliteTable("suppliers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  // Opcional — un proveedor sin teléfono cargado sigue siendo válido (ver
  // docs/inventory/PURCHASES.md §Suppliers).
  phone: text("phone"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
