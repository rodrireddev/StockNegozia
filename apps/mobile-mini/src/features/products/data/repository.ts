import type { ProductQueryInput } from "@stocknegozia/validation";
import { and, asc, desc, eq, gt, gte, like, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/database/client";
import type { DrizzleExecutor } from "@/database/database.types";
import { categories, products } from "@/database/schema";

export interface NewProductRecord {
  name: string;
  sku: string;
  barcode?: string;
  description?: string;
  categoryId?: number;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  minimumStock: number;
  image?: string;
  active: boolean;
}

export type UpdateProductRecord = Partial<Omit<NewProductRecord, "sku">> & { sku?: string };

const SORT_COLUMNS = {
  name: products.name,
  sku: products.sku,
  salePrice: products.salePrice,
  stock: products.stock,
} as const;

function selectWithCategory(executor: DrizzleExecutor = db) {
  return executor
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      barcode: products.barcode,
      description: products.description,
      categoryId: products.categoryId,
      categoryName: categories.name,
      purchasePrice: products.purchasePrice,
      salePrice: products.salePrice,
      stock: products.stock,
      minimumStock: products.minimumStock,
      image: products.image,
      active: products.active,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id));
}

/** Mismas reglas de filtrado/orden que `apps/backend/src/core/products/products.repository.ts`. */
export const productsRepository = {
  findMany(filters: ProductQueryInput) {
    const conditions: (SQL | undefined)[] = [];

    if (filters.search) {
      const term = `%${filters.search}%`;
      conditions.push(
        or(like(products.name, term), like(products.sku, term), like(products.barcode, term)),
      );
    }
    if (filters.categoryId) {
      conditions.push(eq(products.categoryId, filters.categoryId));
    }
    if (filters.status !== "all") {
      conditions.push(eq(products.active, filters.status === "active"));
    }
    if (filters.stockStatus === "out") {
      conditions.push(eq(products.stock, 0));
    } else if (filters.stockStatus === "low") {
      conditions.push(and(gt(products.stock, 0), lte(products.stock, products.minimumStock)));
    } else if (filters.stockStatus === "normal") {
      conditions.push(gt(products.stock, products.minimumStock));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const orderFn = filters.sortDir === "desc" ? desc : asc;

    return selectWithCategory()
      .where(whereClause)
      .orderBy(orderFn(SORT_COLUMNS[filters.sortBy]))
      .all();
  },

  findById(id: number, executor: DrizzleExecutor = db) {
    return selectWithCategory(executor).where(eq(products.id, id)).get();
  },

  findBySku(sku: string) {
    return db.select().from(products).where(eq(products.sku, sku)).get();
  },

  /** Match exacto (no `LIKE`) contra `sku` o `barcode` — usado por el lookup del scanner. */
  findByCode(code: string) {
    return selectWithCategory()
      .where(or(eq(products.sku, code), eq(products.barcode, code)))
      .get();
  },

  findByBarcode(barcode: string) {
    return db.select().from(products).where(eq(products.barcode, barcode)).get();
  },

  insert(data: NewProductRecord, executor: DrizzleExecutor = db) {
    const now = new Date();
    return executor
      .insert(products)
      .values({ ...data, createdAt: now, updatedAt: now })
      .returning({ id: products.id })
      .get();
  },

  update(id: number, data: UpdateProductRecord) {
    db.update(products)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(products.id, id))
      .run();
  },

  /**
   * Ajuste relativo de stock (delta positivo o negativo). La condición `stock + delta >= 0` va en
   * el propio WHERE: la fila solo se actualiza si el resultado no sería negativo, así el chequeo
   * es atómico con la escritura — mismo criterio que el backend. Devuelve `true` si se aplicó.
   */
  adjustStock(id: number, delta: number, executor: DrizzleExecutor = db): boolean {
    const result = executor
      .update(products)
      .set({ stock: sql`${products.stock} + ${delta}`, updatedAt: new Date() })
      .where(and(eq(products.id, id), gte(sql`${products.stock} + ${delta}`, 0)))
      .run();
    return result.changes > 0;
  },

  updateActive(id: number, active: boolean) {
    db.update(products).set({ active, updatedAt: new Date() }).where(eq(products.id, id)).run();
  },
};
