import { Inject, Injectable } from "@nestjs/common";
import type { CashAdjustmentDirection } from "@stocknegozia/api-contracts";
import { and, desc, gte, lte, type SQL } from "drizzle-orm";
import { DRIZZLE_CLIENT } from "../../database/database.constants";
import type { Database, DrizzleExecutor } from "../../database/database.types";
import { cashAdjustments } from "../../database/schema";

export interface NewCashAdjustmentRecord {
  direction: CashAdjustmentDirection;
  amount: number;
  reason: string;
}

export interface CashAdjustmentFilters {
  from?: Date;
  to?: Date;
}

@Injectable()
export class CashAdjustmentsRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  insert(data: NewCashAdjustmentRecord, executor: DrizzleExecutor = this.db) {
    return executor
      .insert(cashAdjustments)
      .values({ ...data, createdAt: new Date() })
      .returning()
      .get();
  }

  findMany(filters: CashAdjustmentFilters = {}, executor: DrizzleExecutor = this.db) {
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
  }
}
