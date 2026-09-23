import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { DRIZZLE_CLIENT } from "../database/database.constants";
import type { Database } from "../database/database.types";
import { streakMilestoneClaims } from "../database/schema";

@Injectable()
export class StreakMilestoneClaimsRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  async findByUserAndDay(userId: string, milestoneDay: number) {
    const [row] = await this.db
      .select()
      .from(streakMilestoneClaims)
      .where(and(eq(streakMilestoneClaims.userId, userId), eq(streakMilestoneClaims.milestoneDay, milestoneDay)));
    return row;
  }

  async insert(data: { id: string; userId: string; milestoneDay: number; creditsAwarded: number }) {
    await this.db.insert(streakMilestoneClaims).values({ ...data, claimedAt: new Date() });
  }
}
