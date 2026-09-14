import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { categories } from "./categories";

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  sku: text("sku").notNull().unique(),
  barcode: text("barcode"),
  description: text("description"),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
  purchasePrice: real("purchase_price").notNull().default(0),
  salePrice: real("sale_price").notNull().default(0),
  stock: integer("stock").notNull().default(0),
  minimumStock: integer("minimum_stock").notNull().default(0),
  image: text("image"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});
