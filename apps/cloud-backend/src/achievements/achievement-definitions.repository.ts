import type {
  AchievementDefinitionCategory,
  AchievementScheduleType,
  TrackableMetricType,
} from "@stocknegozia/api-contracts";
import { Inject, Injectable } from "@nestjs/common";
import { and, asc, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";
import { DRIZZLE_CLIENT } from "../database/database.constants";
import type { Database, DrizzleExecutor } from "../database/database.types";
import {
  achievementDefinitionRevisions,
  achievementDefinitions,
  adminUsers,
} from "../database/schema";

export interface NewAchievementDefinitionRecord {
  id: string;
  key: string;
  label: string;
  description?: string;
  category: AchievementDefinitionCategory;
  metricType?: TrackableMetricType;
  target?: number;
  scheduleType: AchievementScheduleType;
  scheduleConfig?: { date: string };
  creditsAwarded: number;
  active: boolean;
  updatedByAdminId: string;
}

export interface AchievementDefinitionChanges {
  label?: string;
  description?: string | null;
  target?: number | null;
  scheduleType?: AchievementScheduleType;
  scheduleConfig?: { date: string } | null;
  creditsAwarded?: number;
  active?: boolean;
}

@Injectable()
export class AchievementDefinitionsRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  async findAll() {
    return this.db
      .select({ definition: achievementDefinitions, updatedByEmail: adminUsers.email })
      .from(achievementDefinitions)
      .leftJoin(adminUsers, eq(achievementDefinitions.updatedByAdminId, adminUsers.id))
      .orderBy(asc(achievementDefinitions.category), asc(achievementDefinitions.key));
  }

  async findByKey(key: string, executor: DrizzleExecutor = this.db) {
    const [row] = await executor
      .select({ definition: achievementDefinitions, updatedByEmail: adminUsers.email })
      .from(achievementDefinitions)
      .leftJoin(adminUsers, eq(achievementDefinitions.updatedByAdminId, adminUsers.id))
      .where(eq(achievementDefinitions.key, key));
    return row;
  }

  /** Sin el join a `adminUsers` — para uso interno (services que solo necesitan la fila). */
  async findRawByKey(key: string, executor: DrizzleExecutor = this.db) {
    const [row] = await executor
      .select()
      .from(achievementDefinitions)
      .where(eq(achievementDefinitions.key, key));
    return row;
  }

  /** `StreakService`/`SetupQuestsService` — todos los activos de una categoría, sin filtrar más. */
  async findActiveByCategory(
    category: AchievementDefinitionCategory,
    executor: DrizzleExecutor = this.db,
  ) {
    return executor
      .select()
      .from(achievementDefinitions)
      .where(
        and(eq(achievementDefinitions.category, category), eq(achievementDefinitions.active, true)),
      );
  }

  /** `ScheduledGoalsService` — objetivos activos que usan esta métrica, para evaluar tras un evento. */
  async findActiveScheduledGoalsByMetric(
    metricType: TrackableMetricType,
    executor: DrizzleExecutor = this.db,
  ) {
    return executor
      .select()
      .from(achievementDefinitions)
      .where(
        and(
          eq(achievementDefinitions.category, "scheduled_goal"),
          eq(achievementDefinitions.metricType, metricType),
          eq(achievementDefinitions.active, true),
        ),
      );
  }

  /** `GET /gamification/goals/active` — todos los `scheduled_goal` activos, el service filtra por período. */
  async findAllActiveScheduledGoals(executor: DrizzleExecutor = this.db) {
    return executor
      .select()
      .from(achievementDefinitions)
      .where(
        and(
          eq(achievementDefinitions.category, "scheduled_goal"),
          eq(achievementDefinitions.active, true),
        ),
      );
  }

  async insert(data: NewAchievementDefinitionRecord) {
    const now = new Date();
    const [row] = await this.db
      .insert(achievementDefinitions)
      .values({ ...data, createdAt: now, updatedAt: now })
      .returning();
    return row!;
  }

  async findRevisionsByDefinitionId(achievementDefinitionId: string) {
    const changedBy = alias(adminUsers, "changed_by");
    return this.db
      .select({ revision: achievementDefinitionRevisions, changedByEmail: changedBy.email })
      .from(achievementDefinitionRevisions)
      .innerJoin(changedBy, eq(achievementDefinitionRevisions.changedByAdminId, changedBy.id))
      .where(eq(achievementDefinitionRevisions.achievementDefinitionId, achievementDefinitionId))
      .orderBy(desc(achievementDefinitionRevisions.changedAt));
  }

  /** Actualiza la fila vigente y agrega la revisión en la misma transacción, nunca desincronizados. */
  async updateWithRevision(params: {
    definitionId: string;
    previous: {
      label: string;
      description: string | null;
      target: number | null;
      scheduleType: AchievementScheduleType;
      scheduleConfig: { date: string } | null;
      creditsAwarded: number;
      active: boolean;
    };
    changes: AchievementDefinitionChanges;
    note?: string;
    changedByAdminId: string;
  }) {
    const next = { ...params.previous, ...params.changes };

    return this.db.transaction(async (tx) => {
      const now = new Date();
      await tx
        .update(achievementDefinitions)
        .set({
          label: next.label,
          description: next.description,
          target: next.target,
          scheduleType: next.scheduleType,
          scheduleConfig: next.scheduleConfig,
          creditsAwarded: next.creditsAwarded,
          active: next.active,
          updatedAt: now,
          updatedByAdminId: params.changedByAdminId,
        })
        .where(eq(achievementDefinitions.id, params.definitionId));

      await tx.insert(achievementDefinitionRevisions).values({
        id: randomUUID(),
        achievementDefinitionId: params.definitionId,
        previousLabel: params.previous.label,
        newLabel: next.label,
        previousDescription: params.previous.description,
        newDescription: next.description,
        previousTarget: params.previous.target,
        newTarget: next.target,
        previousScheduleType: params.previous.scheduleType,
        newScheduleType: next.scheduleType,
        previousScheduleConfig: params.previous.scheduleConfig,
        newScheduleConfig: next.scheduleConfig,
        previousCreditsAwarded: params.previous.creditsAwarded,
        newCreditsAwarded: next.creditsAwarded,
        previousActive: params.previous.active,
        newActive: next.active,
        note: params.note ?? null,
        changedByAdminId: params.changedByAdminId,
        changedAt: now,
      });
    });
  }
}
