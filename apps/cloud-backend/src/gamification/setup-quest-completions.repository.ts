import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { DRIZZLE_CLIENT } from "../database/database.constants";
import type { Database } from "../database/database.types";
import { setupQuestCompletions, type setupQuestKeyEnum } from "../database/schema";

type SetupQuestKey = (typeof setupQuestKeyEnum.enumValues)[number];

@Injectable()
export class SetupQuestCompletionsRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  async findByUserAndKey(userId: string, questKey: SetupQuestKey) {
    const [row] = await this.db
      .select()
      .from(setupQuestCompletions)
      .where(and(eq(setupQuestCompletions.userId, userId), eq(setupQuestCompletions.questKey, questKey)));
    return row;
  }

  async findAllByUser(userId: string) {
    return this.db.select().from(setupQuestCompletions).where(eq(setupQuestCompletions.userId, userId));
  }

  async insert(data: { id: string; userId: string; questKey: SetupQuestKey; creditsAwarded: number }) {
    await this.db.insert(setupQuestCompletions).values({ ...data, completedAt: new Date() });
  }
}
