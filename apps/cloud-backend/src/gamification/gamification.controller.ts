import { Body, Controller, Get, Inject, Param, Post, Req, UseGuards } from "@nestjs/common";
import type {
  ActiveGoalDto,
  RecordActivityResult,
  RewardedAdClaimResult,
  RewardedAdStatusDto,
  SetupQuestClaimResult,
} from "@stocknegozia/api-contracts";
import { recordActivitySchema, type RecordActivityInput } from "@stocknegozia/validation";
import { AccountJwtGuard, type RequestWithAccount } from "../accounts/account-jwt.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { RewardedAdsService } from "./rewarded-ads.service";
import { ScheduledGoalsService } from "./scheduled-goals.service";
import { SetupQuestsService } from "./setup-quests.service";
import { StreakService } from "./streak.service";

function todayUtcDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

@Controller("gamification")
@UseGuards(AccountJwtGuard)
export class GamificationController {
  constructor(
    @Inject(StreakService) private readonly streakService: StreakService,
    @Inject(ScheduledGoalsService) private readonly scheduledGoalsService: ScheduledGoalsService,
    @Inject(SetupQuestsService) private readonly setupQuestsService: SetupQuestsService,
    @Inject(RewardedAdsService) private readonly rewardedAdsService: RewardedAdsService,
  ) {}

  /**
   * El cliente llama esto cuando el usuario hace algo real de la whitelist de métricas (venta,
   * ajuste de stock, etc. — ver `@stocknegozia/api-contracts/gamification/trackable-metrics`).
   * Mueve la racha (`StreakService`, sin cambios de esa lógica) y, en paralelo, registra el evento
   * de actividad y evalúa/acredita cualquier objetivo programado que se acabe de cumplir con él
   * (`ScheduledGoalsService`) — todo en la misma llamada, sin un endpoint de "claim" separado para
   * objetivos. Idempotente por `clientEventId`: reintentar el mismo evento (ej. `mobile-mini`
   * reenviando desde su cola offline) nunca duplica ni la racha ni el conteo de un objetivo.
   */
  @Post("activity")
  async recordActivity(
    @Body(new ZodValidationPipe(recordActivitySchema)) body: RecordActivityInput,
    @Req() request: RequestWithAccount,
  ): Promise<RecordActivityResult> {
    const userId = request.account!.id;
    const occurredOn = body.occurredOn ?? todayUtcDateString();

    const [streakResult, goalsCompleted] = await Promise.all([
      this.streakService.recordActivity(userId),
      this.scheduledGoalsService.recordEventAndEvaluate(
        userId,
        body.metricType,
        occurredOn,
        body.clientEventId,
      ),
    ]);

    return { ...streakResult, goalsCompleted };
  }

  /**
   * El cliente llama esto cada vez que pasa la acción (ej. cada venta), no solo "la primera" —
   * es idempotente, el backend decide si es la primera vez (ver `SetupQuestsService`).
   */
  @Post("setup-quests/:questKey/claim")
  claimSetupQuest(
    @Param("questKey") questKey: string,
    @Req() request: RequestWithAccount,
  ): Promise<SetupQuestClaimResult> {
    return this.setupQuestsService.claim(request.account!.id, questKey);
  }

  /** Objetivos programados vigentes ahora mismo (puede haber varios a la vez), con su progreso ya calculado. */
  @Get("goals/active")
  listActiveGoals(@Req() request: RequestWithAccount): Promise<ActiveGoalDto[]> {
    return this.scheduledGoalsService.listActiveForUser(request.account!.id);
  }

  /**
   * El cliente llama esto ANTES de cargar el anuncio, para deshabilitar el botón (con cuenta
   * regresiva) si todavía está en cooldown o ya llegó al tope del día — evita hacerle cargar y ver
   * un anuncio completo para recién ahí enterarse de que no le iba a acreditar nada.
   */
  @Get("rewarded-ad/status")
  getRewardedAdStatus(@Req() request: RequestWithAccount): Promise<RewardedAdStatusDto> {
    return this.rewardedAdsService.getStatus(request.account!.id);
  }

  /**
   * ⚠️ Interino, sin SSV — ver el comentario en `RewardedAdsService`. El cliente llama esto
   * cuando el SDK de AdMob confirma que el usuario terminó de ver el rewarded ad.
   */
  @Post("rewarded-ad/claim")
  async claimRewardedAd(@Req() request: RequestWithAccount): Promise<RewardedAdClaimResult> {
    // `ledgerEntryId` es interno (lo usa el callback de SSV para auditoría) — nunca al cliente.
    const { granted, creditsAwarded, sequenceInDay, reason, goalsCompleted } =
      await this.rewardedAdsService.claim(request.account!.id);
    return { granted, creditsAwarded, sequenceInDay, reason, goalsCompleted };
  }
}
