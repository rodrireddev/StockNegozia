import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { DRIZZLE_CLIENT } from "../database/database.constants";
import type { Database, DrizzleExecutor } from "../database/database.types";
import { achievementClaims, achievementDefinitions } from "../database/schema";

@Injectable()
export class AchievementClaimsRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  /** `AchievementsService` (`GET /accounts/me/achievements`) — setup quests + hitos de racha ya reclamados. */
  async findAllByUserWithDefinition(userId: string) {
    return this.db
      .select({ claim: achievementClaims, definition: achievementDefinitions })
      .from(achievementClaims)
      .innerJoin(achievementDefinitions, eq(achievementClaims.achievementDefinitionId, achievementDefinitions.id))
      .where(eq(achievementClaims.userId, userId));
  }

  async findByUserDefinitionAndPeriod(
    userId: string,
    achievementDefinitionId: string,
    periodKey: string,
    executor: DrizzleExecutor = this.db,
  ) {
    const [row] = await executor
      .select()
      .from(achievementClaims)
      .where(
        and(
          eq(achievementClaims.userId, userId),
          eq(achievementClaims.achievementDefinitionId, achievementDefinitionId),
          eq(achievementClaims.periodKey, periodKey),
        ),
      );
    return row;
  }

  async insert(
    data: { id: string; userId: string; achievementDefinitionId: string; periodKey: string; creditsAwarded: number },
    executor: DrizzleExecutor = this.db,
  ) {
    const [row] = await executor
      .insert(achievementClaims)
      .values({ ...data, claimedAt: new Date() })
      .onConflictDoNothing()
      .returning();
    return row;
  }
}
