import { Inject, Injectable } from "@nestjs/common";
import { and, eq, gte, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { DRIZZLE_CLIENT } from "../database/database.constants";
import type { Database } from "../database/database.types";
import { loginFailedAttempts } from "../database/schema";

@Injectable()
export class LoginAttemptsRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  async countSince(ipAddress: string, since: Date): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(loginFailedAttempts)
      .where(
        and(eq(loginFailedAttempts.ipAddress, ipAddress), gte(loginFailedAttempts.failedAt, since)),
      );
    return Number(row?.count ?? 0);
  }

  async recordFailure(ipAddress: string): Promise<void> {
    await this.db
      .insert(loginFailedAttempts)
      .values({ id: randomUUID(), ipAddress, failedAt: new Date() });
  }

  /** Al primer login exitoso de la IP — arranca de cero (doc: nunca bloquea más de lo necesario). */
  async clearFailures(ipAddress: string): Promise<void> {
    await this.db.delete(loginFailedAttempts).where(eq(loginFailedAttempts.ipAddress, ipAddress));
  }
}
