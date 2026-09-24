import { Controller, Get, Inject, Param, Post, Req, UseGuards } from "@nestjs/common";
import type {
  DailyMissionClaimResult,
  DailyMissionTodayDto,
  RecordActivityResult,
  RewardedAdClaimResult,
  SetupQuestClaimResult,
} from "@stocknegozia/api-contracts";
import { AccountJwtGuard, type RequestWithAccount } from "../accounts/account-jwt.guard";
import { DailyMissionsService } from "./daily-missions.service";
import { RewardedAdsService } from "./rewarded-ads.service";
import { SetupQuestsService } from "./setup-quests.service";
import { StreakService } from "./streak.service";

@Controller("gamification")
@UseGuards(AccountJwtGuard)
export class GamificationController {
  constructor(
    @Inject(StreakService) private readonly streakService: StreakService,
    @Inject(SetupQuestsService) private readonly setupQuestsService: SetupQuestsService,
    @Inject(DailyMissionsService) private readonly dailyMissionsService: DailyMissionsService,
    @Inject(RewardedAdsService) private readonly rewardedAdsService: RewardedAdsService,
  ) {}

  /** El cliente llama esto cuando el usuario hace algo real (venta o movimiento de stock, doc §2). */
  @Post("activity")
  recordActivity(@Req() request: RequestWithAccount): Promise<RecordActivityResult> {
    return this.streakService.recordActivity(request.account!.id);
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

  /** Cuál es la misión de hoy (rotación determinística por fecha, doc §1/§2) y si ya se reclamó. */
  @Get("daily-mission/today")
  getTodayMission(@Req() request: RequestWithAccount): Promise<DailyMissionTodayDto> {
    return this.dailyMissionsService.getToday(request.account!.id);
  }

  /**
   * El progreso (3 ventas, 5 stock actualizado) se cuenta 100% local en `mobile-mini` — el
   * backend solo confía en que el cliente llama esto cuando corresponde y aplica el tope de 1/día.
   */
  @Post("daily-mission/claim")
  claimDailyMission(@Req() request: RequestWithAccount): Promise<DailyMissionClaimResult> {
    return this.dailyMissionsService.claim(request.account!.id);
  }

  /**
   * ⚠️ Interino, sin SSV — ver el comentario en `RewardedAdsService`. El cliente llama esto
   * cuando el SDK de AdMob confirma que el usuario terminó de ver el rewarded ad.
   */
  @Post("rewarded-ad/claim")
  async claimRewardedAd(@Req() request: RequestWithAccount): Promise<RewardedAdClaimResult> {
    // `ledgerEntryId` es interno (lo usa el callback de SSV para auditoría) — nunca al cliente.
    const { granted, creditsAwarded, sequenceInDay, reason } = await this.rewardedAdsService.claim(
      request.account!.id,
    );
    return { granted, creditsAwarded, sequenceInDay, reason };
  }
}
