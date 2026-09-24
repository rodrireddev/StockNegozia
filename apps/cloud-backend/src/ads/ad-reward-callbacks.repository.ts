import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DRIZZLE_CLIENT } from "../database/database.constants";
import type { Database } from "../database/database.types";
import { adRewardCallbacks } from "../database/schema";

export interface InsertAdRewardCallbackInput {
  id: string;
  transactionId: string;
  userId: string;
  adNetwork: string;
  adUnit: string;
  rewardItem: string;
  rewardAmount: number;
  verifiedAt: Date;
  creditLedgerEntryId: string | null;
}

@Injectable()
export class AdRewardCallbacksRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  async findByTransactionId(transactionId: string) {
    const [row] = await this.db
      .select()
      .from(adRewardCallbacks)
      .where(eq(adRewardCallbacks.transactionId, transactionId));
    return row;
  }

  async insert(data: InsertAdRewardCallbackInput): Promise<void> {
    await this.db.insert(adRewardCallbacks).values(data);
  }
}
