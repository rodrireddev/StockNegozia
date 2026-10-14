import { and, desc, eq, gte, lte, type SQL } from "drizzle-orm";
import { db } from "@/database/client";
import type { DrizzleExecutor } from "@/database/database.types";
import { purchaseItems, purchases } from "@/database/schema";

export interface NewPurchaseRecord {
  supplierId: number;
  /** Snapshot inmutable del nombre del proveedor al momento de la compra — lo resuelve el
   *  llamador, que ya tiene el `SupplierDto` a mano tras validar el proveedor. */
  supplierName: string;
  total: number;
  createdAt: Date;
}

export interface NewPurchaseItemRecord {
  purchaseId: number;
  productId: number;
  quantity: number;
  unitCost: number;
  subtotal: number;
}

export const purchasesRepository = {
  findMany(filters: { from?: Date; to?: Date } = {}, executor: DrizzleExecutor = db) {
    const conditions: (SQL | undefined)[] = [];
    if (filters.from) conditions.push(gte(purchases.createdAt, filters.from));
    if (filters.to) conditions.push(lte(purchases.createdAt, filters.to));
    return executor
      .select()
      .from(purchases)
      .where(and(...conditions))
      .orderBy(desc(purchases.createdAt))
      .all();
  },

  findById(id: number, executor: DrizzleExecutor = db) {
    return executor.select().from(purchases).where(eq(purchases.id, id)).get();
  },

  insertPurchase(data: NewPurchaseRecord, executor: DrizzleExecutor = db) {
    return executor.insert(purchases).values(data).returning({ id: purchases.id }).get();
  },

  insertPurchaseItems(items: NewPurchaseItemRecord[], executor: DrizzleExecutor = db) {
    if (items.length === 0) return;
    executor.insert(purchaseItems).values(items).run();
  },

  findItemsByPurchaseId(purchaseId: number, executor: DrizzleExecutor = db) {
    return executor
      .select()
      .from(purchaseItems)
      .where(eq(purchaseItems.purchaseId, purchaseId))
      .all();
  },
};
