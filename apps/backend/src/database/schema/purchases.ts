import { sqliteTable, integer, real, text, index } from "drizzle-orm/sqlite-core";
import { products } from "./products";
import { suppliers } from "./suppliers";

/**
 * Una compra registra, en un único paso, la adquisición de mercadería y su ingreso inmediato al
 * inventario — ver docs/inventory/PURCHASES.md. No hay estados ni recepción separada en este
 * milestone: una compra creada se considera recibida. Es inmutable una vez creada (no hay
 * update/delete) — cualquier corrección futura (cancelación, devolución) será una operación
 * explícita nueva, no una edición de esta fila.
 */
export const purchases = sqliteTable(
  "purchases",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    supplierId: integer("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    // Snapshot inmutable del nombre del proveedor al momento de la compra — no se resuelve por
    // JOIN contra `suppliers.name` en cada lectura porque el proveedor SÍ puede renombrarse
    // después (`PATCH /suppliers/:id`), y una compra pasada no debe reflejar ese cambio
    // retroactivamente (mismo criterio que `stock_movements.device_name`, ver
    // database/schema/stock-movements.ts). `supplierId` sigue existiendo para referenciar al
    // proveedor actual.
    supplierName: text("supplier_name").notNull(),
    // Calculado por el backend a partir de purchase_items — nunca confiado del cliente.
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
