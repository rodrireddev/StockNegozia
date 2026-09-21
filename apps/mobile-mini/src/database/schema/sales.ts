import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { products } from "./products";

export const sales = sqliteTable(
  "sales",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    status: text("status", { enum: ["completed", "cancelled"] })
      .notNull()
      .default("completed"),
    total: real("total").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    cancelledAt: integer("cancelled_at", { mode: "timestamp" }),
  },
  (table) => ({
    statusIdx: index("sales_status_idx").on(table.status),
    createdAtIdx: index("sales_created_at_idx").on(table.createdAt),
  }),
);

export const saleItems = sqliteTable(
  "sale_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    saleId: integer("sale_id")
      .notNull()
      .references(() => sales.id),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    quantity: integer("quantity").notNull(),
    // Snapshot histórico: el precio del producto al momento de la venta, no el actual.
    unitPrice: real("unit_price").notNull(),
    // Snapshot histórico del costo (`products.purchasePrice`) al momento de la venta — mismo
    // criterio que `unitPrice`: la base para "Ganancias" (`features/profits`) nunca puede ser el
    // costo ACTUAL del producto, o una venta vieja cambiaría de ganancia cada vez que se actualiza
    // el costo del producto. `default(0)` sólo aplica mientras se ejecuta el ALTER TABLE en sí —
    // la migración que agrega esta columna (`0001_lucky_marvex.sql`) hace un UPDATE inmediatamente
    // después para completar las filas ya existentes con el costo real de la última COMPRA
    // (`purchase_items.unitCost`) vigente al momento de esa venta — sólo cae al `purchasePrice`
    // ACTUAL del producto si nunca hubo una compra registrada antes de esa venta. Dejarlas en 0
    // haría que cada venta vieja mostrara el 100% del precio de venta como ganancia.
    unitCost: real("unit_cost").notNull().default(0),
    subtotal: real("subtotal").notNull(),
  },
  (table) => ({
    saleIdIdx: index("sale_items_sale_id_idx").on(table.saleId),
    productIdIdx: index("sale_items_product_id_idx").on(table.productId),
  }),
);
