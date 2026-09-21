import { desc, eq } from "drizzle-orm";
import { db } from "@/database/client";
import type { DrizzleExecutor } from "@/database/database.types";
import { saleItems, sales } from "@/database/schema";

export interface NewSaleRecord {
  status: "completed";
  total: number;
  createdAt: Date;
}

export interface NewSaleItemRecord {
  saleId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  subtotal: number;
}

export const salesRepository = {
  insertSale(data: NewSaleRecord, executor: DrizzleExecutor = db) {
    return executor.insert(sales).values(data).returning({ id: sales.id }).get();
  },

  insertSaleItems(items: NewSaleItemRecord[], executor: DrizzleExecutor = db) {
    if (items.length === 0) return;
    executor.insert(saleItems).values(items).run();
  },

  findById(id: number, executor: DrizzleExecutor = db) {
    return executor.select().from(sales).where(eq(sales.id, id)).get();
  },

  findMany(executor: DrizzleExecutor = db) {
    return executor.select().from(sales).orderBy(desc(sales.createdAt)).all();
  },

  findItemsBySaleId(saleId: number, executor: DrizzleExecutor = db) {
    return executor.select().from(saleItems).where(eq(saleItems.saleId, saleId)).all();
  },

  markCancelled(id: number, cancelledAt: Date, executor: DrizzleExecutor = db) {
    executor.update(sales).set({ status: "cancelled", cancelledAt }).where(eq(sales.id, id)).run();
  },
};
