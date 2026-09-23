import { Module } from "@nestjs/common";
import { AdminAuthModule } from "../admin-auth/admin-auth.module";
import { CreditConfigController } from "./credit-config.controller";
import { CreditConfigRepository } from "./credit-config.repository";
import { CreditConfigService } from "./credit-config.service";

@Module({
  imports: [AdminAuthModule],
  controllers: [CreditConfigController],
  providers: [CreditConfigService, CreditConfigRepository],
  // Otros módulos (créditos, gamification) necesitan leer el valor vigente de un ítem (ej.
  // "source.welcome_bonus") sin pasar por HTTP — ver `CreditConfigService.getValueByKey`.
  exports: [CreditConfigService],
})
export class CreditConfigModule {}
