import { Inject, Injectable } from "@nestjs/common";
import { desc, eq } from "drizzle-orm";
import { DRIZZLE_CLIENT } from "../database/database.constants";
import type { Database, DrizzleExecutor } from "../database/database.types";
import { creditLedger } from "../database/schema";

@Injectable()
export class CreditsRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  async findLatestByUserId(userId: string, executor: DrizzleExecutor = this.db) {
    const [row] = await executor
      .select()
      .from(creditLedger)
      .where(eq(creditLedger.userId, userId))
      .orderBy(desc(creditLedger.createdAt))
      .limit(1);
    return row;
  }

  /** Envuelve `grant` en una transacción — ver el comentario en `CreditsService.grant`. */
  async runInTransaction<T>(callback: (executor: DrizzleExecutor) => Promise<T>): Promise<T> {
    return this.db.transaction(callback);
  }

  async findByIdempotencyKey(idempotencyKey: string) {
    const [row] = await this.db
      .select()
      .from(creditLedger)
      .where(eq(creditLedger.idempotencyKey, idempotencyKey));
    return row;
  }

  async findRecentByUserId(userId: string, limit: number) {
    return this.db
      .select()
      .from(creditLedger)
      .where(eq(creditLedger.userId, userId))
      .orderBy(desc(creditLedger.createdAt))
      .limit(limit);
  }

  async insert(
    data: {
      id: string;
      userId: string;
      amount: number;
      balanceAfter: number;
      reason: (typeof creditLedger.$inferInsert)["reason"];
      reasonMetadata?: Record<string, unknown>;
      idempotencyKey?: string;
    },
    executor: DrizzleExecutor = this.db,
  ) {
    const [row] = await executor
      .insert(creditLedger)
      .values({ ...data, reasonMetadata: data.reasonMetadata ?? null, createdAt: new Date() })
      .returning();
    return row;
  }
}
