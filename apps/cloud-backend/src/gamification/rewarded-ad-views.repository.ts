import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { DRIZZLE_CLIENT } from "../database/database.constants";
import type { Database } from "../database/database.types";
import { rewardedAdViews } from "../database/schema";

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

@Injectable()
export class RewardedAdViewsRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  async countToday(userId: string): Promise<number> {
    const rows = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(rewardedAdViews)
      .where(and(eq(rewardedAdViews.userId, userId), gte(rewardedAdViews.viewedAt, startOfTodayUtc())));
    return Number(rows[0]?.count ?? 0);
  }

  async findLatestByUser(userId: string) {
    const [row] = await this.db
      .select()
      .from(rewardedAdViews)
      .where(eq(rewardedAdViews.userId, userId))
      .orderBy(desc(rewardedAdViews.viewedAt))
      .limit(1);
    return row;
  }

  async insert(data: { id: string; userId: string; sequenceInDay: number; creditsAwarded: number }) {
    await this.db.insert(rewardedAdViews).values({ ...data, viewedAt: new Date() });
  }
}
