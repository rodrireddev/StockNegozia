import { Module } from "@nestjs/common";
import { CreditConfigModule } from "../credit-config/credit-config.module";
import { CreditsModule } from "../credits/credits.module";
import { AccountAuthModule } from "./account-auth.module";
import { AccountsController } from "./accounts.controller";
import { AccountsService } from "./accounts.service";
import { LoginAttemptsRepository } from "./login-attempts.repository";
import { ReferralsRepository } from "./referrals.repository";
import { TurnstileService } from "./turnstile.service";

@Module({
  imports: [AccountAuthModule, CreditsModule, CreditConfigModule],
  controllers: [AccountsController],
  providers: [AccountsService, ReferralsRepository, TurnstileService, LoginAttemptsRepository],
  // `ReferralsRepository` lo necesita GamificationModule para validar el referido cuando el
  // invitado llega a día 3 de racha (doc §1, "éxito" = actividad real en la primera semana).
  exports: [ReferralsRepository],
})
export class AccountsModule {}
