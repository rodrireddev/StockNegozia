import { Inject, Injectable } from "@nestjs/common";
import { desc, eq } from "drizzle-orm";
import { DRIZZLE_CLIENT } from "../../database/database.constants";
import type { Database, DrizzleExecutor } from "../../database/database.types";
import { products, saleItems, sales } from "../../database/schema";

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
  subtotal: number;
}

@Injectable()
export class SalesRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  insertSale(data: NewSaleRecord, executor: DrizzleExecutor = this.db) {
    return executor.insert(sales).values(data).returning({ id: sales.id }).get();
  }

  insertSaleItems(items: NewSaleItemRecord[], executor: DrizzleExecutor = this.db) {
    if (items.length === 0) return;
    executor.insert(saleItems).values(items).run();
  }

  findById(id: number, executor: DrizzleExecutor = this.db) {
    return executor.select().from(sales).where(eq(sales.id, id)).get();
  }

  findMany(executor: DrizzleExecutor = this.db) {
    return executor.select().from(sales).orderBy(desc(sales.createdAt)).all();
  }

  findItemsBySaleId(saleId: number, executor: DrizzleExecutor = this.db) {
    return executor.select().from(saleItems).where(eq(saleItems.saleId, saleId)).all();
  }

  /** Trae los items de una venta con el nombre/SKU actual del producto — usado sólo para armar el
   *  recibo PDF (ver sale-receipt.pdf.ts). Los productos nunca se hard-deletean (sólo se
   *  desactivan), así que el join siempre resuelve. */
  findItemsWithProductBySaleId(saleId: number, executor: DrizzleExecutor = this.db) {
    return executor
      .select({
        id: saleItems.id,
        productId: saleItems.productId,
        productName: products.name,
        productSku: products.sku,
        quantity: saleItems.quantity,
        unitPrice: saleItems.unitPrice,
        subtotal: saleItems.subtotal,
      })
      .from(saleItems)
      .innerJoin(products, eq(saleItems.productId, products.id))
      .where(eq(saleItems.saleId, saleId))
      .all();
  }

  markCancelled(id: number, cancelledAt: Date, executor: DrizzleExecutor = this.db) {
    executor.update(sales).set({ status: "cancelled", cancelledAt }).where(eq(sales.id, id)).run();
  }
}
