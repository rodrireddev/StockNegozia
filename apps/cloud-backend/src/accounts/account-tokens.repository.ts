import { Inject, Injectable } from "@nestjs/common";
import { and, eq, gt, isNull } from "drizzle-orm";
import { DRIZZLE_CLIENT } from "../database/database.constants";
import type { Database } from "../database/database.types";
import { accountTokens, type accountTokenPurposeEnum } from "../database/schema";

type TokenPurpose = (typeof accountTokenPurposeEnum.enumValues)[number];

@Injectable()
export class AccountTokensRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  async insert(data: {
    id: string;
    userId: string;
    purpose: TokenPurpose;
    tokenHash: string;
    expiresAt: Date;
  }) {
    await this.db.insert(accountTokens).values({ ...data, createdAt: new Date() });
  }

  async findValidByHash(tokenHash: string, purpose: TokenPurpose) {
    const [row] = await this.db
      .select()
      .from(accountTokens)
      .where(
        and(
          eq(accountTokens.tokenHash, tokenHash),
          eq(accountTokens.purpose, purpose),
          isNull(accountTokens.consumedAt),
          gt(accountTokens.expiresAt, new Date()),
        ),
      );
    return row;
  }

  async markConsumed(id: string) {
    await this.db.update(accountTokens).set({ consumedAt: new Date() }).where(eq(accountTokens.id, id));
  }

  /** Antes de emitir un token nuevo — nunca queda más de uno vivo por usuario y propósito. */
  async invalidateAllUnconsumedForUser(userId: string, purpose: TokenPurpose) {
    await this.db
      .update(accountTokens)
      .set({ consumedAt: new Date() })
      .where(
        and(
          eq(accountTokens.userId, userId),
          eq(accountTokens.purpose, purpose),
          isNull(accountTokens.consumedAt),
        ),
      );
  }
}
