import { Module } from "@nestjs/common";
import { AccountAuthModule } from "../accounts/account-auth.module";
import { CreditConfigModule } from "../credit-config/credit-config.module";
import { CreditsController } from "./credits.controller";
import { CreditsRepository } from "./credits.repository";
import { CreditsService } from "./credits.service";
import { EntitlementsRepository } from "./entitlements.repository";
import { EntitlementsService } from "./entitlements.service";

@Module({
  // Solo AccountAuthModule (guard + JWT), no AccountsModule entero — AccountsModule ya depende de
  // CreditsModule (para la bienvenida al registrarse), así que importarlo acá crearía un ciclo.
  imports: [AccountAuthModule, CreditConfigModule],
  controllers: [CreditsController],
  providers: [CreditsService, CreditsRepository, EntitlementsService, EntitlementsRepository],
  exports: [CreditsService],
})
export class CreditsModule {}
