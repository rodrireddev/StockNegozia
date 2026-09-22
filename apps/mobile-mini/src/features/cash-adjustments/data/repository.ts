import { and, desc, gte, lte, type SQL } from "drizzle-orm";
import { db } from "@/database/client";
import type { DrizzleExecutor } from "@/database/database.types";
import { cashAdjustments } from "@/database/schema";

export interface NewCashAdjustmentRecord {
  direction: "IN" | "OUT";
  amount: number;
  reason: string;
}

export interface CashAdjustmentFilters {
  from?: Date;
  to?: Date;
}

export const cashAdjustmentsRepository = {
  insert(data: NewCashAdjustmentRecord, executor: DrizzleExecutor = db) {
    return executor
      .insert(cashAdjustments)
      .values({ ...data, createdAt: new Date() })
      .returning()
      .get();
  },

  findMany(filters: CashAdjustmentFilters = {}, executor: DrizzleExecutor = db) {
    const conditions: (SQL | undefined)[] = [];
    if (filters.from) conditions.push(gte(cashAdjustments.createdAt, filters.from));
    if (filters.to) conditions.push(lte(cashAdjustments.createdAt, filters.to));
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return executor
      .select()
      .from(cashAdjustments)
      .where(whereClause)
      .orderBy(desc(cashAdjustments.createdAt), desc(cashAdjustments.id))
      .all();
  },
};
