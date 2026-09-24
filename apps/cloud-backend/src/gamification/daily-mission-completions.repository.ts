import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { DRIZZLE_CLIENT } from "../database/database.constants";
import type { Database } from "../database/database.types";
import { dailyMissionCompletions, type dailyMissionKeyEnum } from "../database/schema";

type DailyMissionKey = (typeof dailyMissionKeyEnum.enumValues)[number];

@Injectable()
export class DailyMissionCompletionsRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  async findByUserAndDate(userId: string, activityDate: string) {
    const [row] = await this.db
      .select()
      .from(dailyMissionCompletions)
      .where(
        and(eq(dailyMissionCompletions.userId, userId), eq(dailyMissionCompletions.activityDate, activityDate)),
      );
    return row;
  }

  async insert(data: {
    id: string;
    userId: string;
    missionKey: DailyMissionKey;
    activityDate: string;
    creditsAwarded: number;
  }) {
    await this.db.insert(dailyMissionCompletions).values({ ...data, completedAt: new Date() });
  }
}
