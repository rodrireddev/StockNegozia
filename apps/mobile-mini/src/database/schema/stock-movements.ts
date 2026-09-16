import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { products } from "./products";
import { sales } from "./sales";
import { purchases } from "./purchases";

/**
 * Historial auditable de modificaciones de stock — mismo modelo que
 * apps/backend/src/database/schema/stock-movements.ts, MENOS `requestId`/`deviceId`/`deviceName`/
 * `deviceType`: acá no hay contexto HTTP ni dispositivos múltiples que trazar (un solo dispositivo,
 * sin pairing). `products.stock` sigue siendo la única fuente de verdad del estado actual; esta
 * tabla es append-only (nunca se edita ni se borra un movimiento — una cancelación genera uno
 * nuevo).
 */
export const stockMovements = sqliteTable(
  "stock_movements",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    type: text("type", { enum: ["SALE", "SALE_CANCELLATION", "ADJUSTMENT", "PURCHASE"] }).notNull(),
    direction: text("direction", { enum: ["IN", "OUT"] }).notNull(),
    // Siempre positiva — la dirección es un campo separado (nunca +3/-3 acá).
    quantity: integer("quantity").notNull(),
    stockBefore: integer("stock_before").notNull(),
    stockAfter: integer("stock_after").notNull(),
    saleId: integer("sale_id").references(() => sales.id),
    purchaseId: integer("purchase_id").references(() => purchases.id),
    // Obligatorio a nivel de aplicación para ADJUSTMENT (validado en adjustStock(), no acá).
    reason: text("reason"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    productIdIdx: index("stock_movements_product_id_idx").on(table.productId),
    createdAtIdx: index("stock_movements_created_at_idx").on(table.createdAt),
    saleIdIdx: index("stock_movements_sale_id_idx").on(table.saleId),
    purchaseIdIdx: index("stock_movements_purchase_id_idx").on(table.purchaseId),
  }),
);
