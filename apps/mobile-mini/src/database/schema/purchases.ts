import { sqliteTable, integer, real, text, index } from "drizzle-orm/sqlite-core";
import { products } from "./products";
import { suppliers } from "./suppliers";

/**
 * Una compra registra, en un único paso, la adquisición de mercadería y su ingreso inmediato al
 * inventario — mismo modelo que apps/backend/src/database/schema/purchases.ts. Inmutable una vez
 * creada (sin update/delete).
 */
export const purchases = sqliteTable(
  "purchases",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    supplierId: integer("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    // Snapshot inmutable del nombre del proveedor al momento de la compra — el proveedor puede
    // renombrarse después sin afectar compras pasadas.
    supplierName: text("supplier_name").notNull(),
    // Calculado a partir de purchase_items — nunca confiado del llamador.
    total: real("total").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    supplierIdIdx: index("purchases_supplier_id_idx").on(table.supplierId),
    createdAtIdx: index("purchases_created_at_idx").on(table.createdAt),
  }),
);

export const purchaseItems = sqliteTable(
  "purchase_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    purchaseId: integer("purchase_id")
      .notNull()
      .references(() => purchases.id),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    quantity: integer("quantity").notNull(),
    unitCost: real("unit_cost").notNull(),
    subtotal: real("subtotal").notNull(),
  },
  (table) => ({
    purchaseIdIdx: index("purchase_items_purchase_id_idx").on(table.purchaseId),
    productIdIdx: index("purchase_items_product_id_idx").on(table.productId),
  }),
);
