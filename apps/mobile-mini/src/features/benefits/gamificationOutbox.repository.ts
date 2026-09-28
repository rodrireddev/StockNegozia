import { asc, eq, isNull } from "drizzle-orm";
import { db } from "@/database/client";
import type { DrizzleExecutor } from "@/database/database.types";
import { gamificationOutbox } from "@/database/schema";

function todayLocalDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export const gamificationOutboxRepository = {
  enqueueActivity(metricType: string, executor: DrizzleExecutor = db) {
    return executor
      .insert(gamificationOutbox)
      .values({ kind: "activity", metricType, occurredOn: todayLocalDateString(), createdAt: new Date() })
      .returning()
      .get();
  },

  enqueueSetupQuestClaim(questKey: string, executor: DrizzleExecutor = db) {
    return executor
      .insert(gamificationOutbox)
      .values({ kind: "setup_quest_claim", questKey, createdAt: new Date() })
      .returning()
      .get();
  },

  /** En orden de creación — el runner drena secuencialmente, nunca fuera de orden. */
  findUnsynced(executor: DrizzleExecutor = db) {
    return executor
      .select()
      .from(gamificationOutbox)
      .where(isNull(gamificationOutbox.syncedAt))
      .orderBy(asc(gamificationOutbox.id))
      .all();
  },

  markSynced(id: number, executor: DrizzleExecutor = db) {
    return executor.update(gamificationOutbox).set({ syncedAt: new Date() }).where(eq(gamificationOutbox.id, id)).run();
  },
};
