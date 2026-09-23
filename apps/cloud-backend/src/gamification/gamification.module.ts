import { Module } from "@nestjs/common";
import { AccountAuthModule } from "../accounts/account-auth.module";
import { AccountsModule } from "../accounts/accounts.module";
import { CreditConfigModule } from "../credit-config/credit-config.module";
import { CreditsModule } from "../credits/credits.module";
import { GamificationController } from "./gamification.controller";
import { StreakMilestoneClaimsRepository } from "./streak-milestone-claims.repository";
import { StreakService } from "./streak.service";

@Module({
  imports: [AccountAuthModule, AccountsModule, CreditsModule, CreditConfigModule],
  controllers: [GamificationController],
  providers: [StreakService, StreakMilestoneClaimsRepository],
})
export class GamificationModule {}
