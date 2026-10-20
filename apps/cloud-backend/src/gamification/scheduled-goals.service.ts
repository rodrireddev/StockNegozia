import type {
  ActiveGoalDto,
  CompletedGoalResult,
  TrackableMetricType,
} from "@stocknegozia/api-contracts";
import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { AchievementDefinitionsRepository } from "../achievements/achievement-definitions.repository";
import { CreditsService } from "../credits/credits.service";
import { AchievementClaimsRepository } from "./achievement-claims.repository";
import { ActivityEventsRepository } from "./activity-events.repository";
import { periodRangeFor } from "./period.util";

function todayUtcDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Reemplaza `DailyMissionsService` — objetivos programados (`achievement_definitions`, categoría
 * `scheduled_goal`) editables desde el panel admin, con cualquier calendario (diario/semanal/
 * mensual/fecha específica) y cualquier métrica de la whitelist (`TRACKABLE_METRIC_KEYS`). A
 * diferencia del viejo sistema de "misión diaria", puede haber cualquier cantidad de objetivos
 * activos al mismo tiempo — no rota de a uno.
 *
 * El progreso se calcula 100% acá (sumando `activity_events`, ver `period.util.ts`), nunca en el
 * cliente — `mobile-mini` solo manda el evento (`recordEventAndEvaluate`) y lee el resultado
 * (`listActiveForUser`), nunca cuenta nada localmente.
 */
@Injectable()
export class ScheduledGoalsService {
  constructor(
    @Inject(ActivityEventsRepository)
    private readonly activityEventsRepository: ActivityEventsRepository,
    @Inject(AchievementDefinitionsRepository)
    private readonly achievementDefinitionsRepository: AchievementDefinitionsRepository,
    @Inject(AchievementClaimsRepository)
    private readonly achievementClaimsRepository: AchievementClaimsRepository,
    @Inject(CreditsService) private readonly creditsService: CreditsService,
  ) {}

  /**
   * Registra un evento de actividad (idempotente por `clientEventId`, ver `ActivityEventsRepository`)
   * y evalúa/acredita cualquier objetivo programado que use esta métrica y que se acabe de cumplir
   * con este evento — mismo patrón que ya usa `StreakService` para hitos de racha: se detecta y
   * acredita en la misma llamada, sin un endpoint de "claim" separado.
   *
   * Un evento repetido (mismo `clientEventId` — ej. un reintento del outbox offline de
   * `mobile-mini`) no vuelve a evaluar nada: si ya se procesó una vez, los objetivos que
   * correspondía otorgar ya se otorgaron esa primera vez.
   */
  async recordEventAndEvaluate(
    userId: string,
    metricType: TrackableMetricType,
    occurredOn: string,
    clientEventId: string,
  ): Promise<CompletedGoalResult[]> {
    const inserted = await this.activityEventsRepository.insert({
      id: randomUUID(),
      userId,
      metricType,
      occurredOn,
      clientEventId,
    });
    if (!inserted) return [];

    const goals =
      await this.achievementDefinitionsRepository.findActiveScheduledGoalsByMetric(metricType);
    const completed: CompletedGoalResult[] = [];

    for (const goal of goals) {
      const range = periodRangeFor(goal.scheduleType, occurredOn, goal.scheduleConfig);
      if (!range || goal.target == null) continue;

      const alreadyClaimed = await this.achievementClaimsRepository.findByUserDefinitionAndPeriod(
        userId,
        goal.id,
        range.periodKey,
      );
      if (alreadyClaimed) continue;

      const progress = await this.activityEventsRepository.countInRange(
        userId,
        metricType,
        range.from,
        range.to,
      );
      if (progress < goal.target) continue;

      await this.creditsService.grant(userId, goal.creditsAwarded, "scheduled_goal", {
        reasonMetadata: { achievementKey: goal.key, periodKey: range.periodKey },
        idempotencyKey: `scheduled_goal:${userId}:${goal.id}:${range.periodKey}`,
      });
      const claim = await this.achievementClaimsRepository.insert({
        id: randomUUID(),
        userId,
        achievementDefinitionId: goal.id,
        periodKey: range.periodKey,
        creditsAwarded: goal.creditsAwarded,
      });
      // `onConflictDoNothing` puede devolver vacío bajo una carrera real (dos eventos casi
      // simultáneos) — en ese caso el crédito ya se otorgó una vez por `idempotencyKey`, así que
      // no hace falta acreditar de nuevo, pero tampoco reportarlo como recién completado acá.
      if (claim)
        completed.push({ key: goal.key, label: goal.label, creditsAwarded: goal.creditsAwarded });
    }

    return completed;
  }

  /** `GET /gamification/goals/active` — todo lo vigente hoy, con progreso ya calculado. */
  async listActiveForUser(userId: string): Promise<ActiveGoalDto[]> {
    const today = todayUtcDateString();
    const goals = await this.achievementDefinitionsRepository.findAllActiveScheduledGoals();
    const active: ActiveGoalDto[] = [];

    for (const goal of goals) {
      if (!goal.metricType || goal.target == null) continue;
      const range = periodRangeFor(goal.scheduleType, today, goal.scheduleConfig);
      if (!range) continue;

      const [claim, progress] = await Promise.all([
        this.achievementClaimsRepository.findByUserDefinitionAndPeriod(
          userId,
          goal.id,
          range.periodKey,
        ),
        this.activityEventsRepository.countInRange(userId, goal.metricType, range.from, range.to),
      ]);

      active.push({
        key: goal.key,
        label: goal.label,
        description: goal.description,
        metricType: goal.metricType,
        target: goal.target,
        progress: Math.min(progress, goal.target),
        scheduleType: goal.scheduleType,
        periodKey: range.periodKey,
        alreadyClaimed: !!claim,
        creditsAwarded: goal.creditsAwarded,
      });
    }

    return active;
  }
}
