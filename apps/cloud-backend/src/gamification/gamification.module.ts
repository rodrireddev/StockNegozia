import { Module } from "@nestjs/common";
import { AccountAuthModule } from "../accounts/account-auth.module";
import { AccountsModule } from "../accounts/accounts.module";
import { CreditConfigModule } from "../credit-config/credit-config.module";
import { CreditsModule } from "../credits/credits.module";
import { AchievementsController } from "./achievements.controller";
import { AchievementsService } from "./achievements.service";
import { DailyMissionCompletionsRepository } from "./daily-mission-completions.repository";
import { DailyMissionsService } from "./daily-missions.service";
import { GamificationController } from "./gamification.controller";
import { RewardedAdViewsRepository } from "./rewarded-ad-views.repository";
import { RewardedAdsService } from "./rewarded-ads.service";
import { SetupQuestCompletionsRepository } from "./setup-quest-completions.repository";
import { SetupQuestsService } from "./setup-quests.service";
import { StreakMilestoneClaimsRepository } from "./streak-milestone-claims.repository";
import { StreakService } from "./streak.service";

@Module({
  imports: [AccountAuthModule, AccountsModule, CreditsModule, CreditConfigModule],
  controllers: [GamificationController, AchievementsController],
  providers: [
    StreakService,
    StreakMilestoneClaimsRepository,
    SetupQuestsService,
    SetupQuestCompletionsRepository,
    DailyMissionsService,
    DailyMissionCompletionsRepository,
    RewardedAdsService,
    RewardedAdViewsRepository,
    AchievementsService,
  ],
  // Solo `RewardedAdsService` — lo reusa `AdsModule` (callback de SSV) para no duplicar la
  // lógica de tope/cooldown/monto decreciente. Nada de auth se re-exporta acá.
  exports: [RewardedAdsService],
})
export class GamificationModule {}
