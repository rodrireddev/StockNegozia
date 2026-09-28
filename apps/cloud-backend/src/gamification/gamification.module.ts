import { Module } from "@nestjs/common";
import { AccountAuthModule } from "../accounts/account-auth.module";
import { AccountsModule } from "../accounts/accounts.module";
import { AchievementDefinitionsRepository } from "../achievements/achievement-definitions.repository";
import { CreditConfigModule } from "../credit-config/credit-config.module";
import { CreditsModule } from "../credits/credits.module";
import { AchievementClaimsRepository } from "./achievement-claims.repository";
import { AchievementsController } from "./achievements.controller";
import { AchievementsService } from "./achievements.service";
import { ActivityEventsRepository } from "./activity-events.repository";
import { GamificationController } from "./gamification.controller";
import { RewardedAdViewsRepository } from "./rewarded-ad-views.repository";
import { RewardedAdsService } from "./rewarded-ads.service";
import { ScheduledGoalsService } from "./scheduled-goals.service";
import { SetupQuestsService } from "./setup-quests.service";
import { StreakService } from "./streak.service";

@Module({
  imports: [AccountAuthModule, AccountsModule, CreditsModule, CreditConfigModule],
  controllers: [GamificationController, AchievementsController],
  providers: [
    AchievementDefinitionsRepository,
    AchievementClaimsRepository,
    ActivityEventsRepository,
    StreakService,
    SetupQuestsService,
    ScheduledGoalsService,
    RewardedAdsService,
    RewardedAdViewsRepository,
    AchievementsService,
  ],
  // Solo `RewardedAdsService` — lo reusa `AdsModule` (callback de SSV) para no duplicar la
  // lógica de tope/cooldown/monto decreciente. Nada de auth se re-exporta acá.
  exports: [RewardedAdsService],
})
export class GamificationModule {}
