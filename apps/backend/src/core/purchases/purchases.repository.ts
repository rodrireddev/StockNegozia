import { Inject, Injectable } from "@nestjs/common";
import { desc, eq } from "drizzle-orm";
import { DRIZZLE_CLIENT } from "../../database/database.constants";
import type { Database, DrizzleExecutor } from "../../database/database.types";
import { purchaseItems, purchases, suppliers } from "../../database/schema";

export interface NewPurchaseRecord {
  supplierId: number;
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

@Injectable()
export class PurchasesRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  private selectWithSupplier(executor: DrizzleExecutor = this.db) {
    return executor
      .select({
        id: purchases.id,
        supplierId: purchases.supplierId,
        supplierName: suppliers.name,
        total: purchases.total,
        createdAt: purchases.createdAt,
      })
      .from(purchases)
      .leftJoin(suppliers, eq(purchases.supplierId, suppliers.id));
  }

  findMany(executor: DrizzleExecutor = this.db) {
    return this.selectWithSupplier(executor).orderBy(desc(purchases.createdAt)).all();
  }

  findById(id: number, executor: DrizzleExecutor = this.db) {
    return this.selectWithSupplier(executor).where(eq(purchases.id, id)).get();
  }

  insertPurchase(data: NewPurchaseRecord, executor: DrizzleExecutor = this.db) {
    return executor.insert(purchases).values(data).returning({ id: purchases.id }).get();
  }

  insertPurchaseItems(items: NewPurchaseItemRecord[], executor: DrizzleExecutor = this.db) {
    if (items.length === 0) return;
    executor.insert(purchaseItems).values(items).run();
  }

  findItemsByPurchaseId(purchaseId: number, executor: DrizzleExecutor = this.db) {
    return executor.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, purchaseId)).all();
  }
}
