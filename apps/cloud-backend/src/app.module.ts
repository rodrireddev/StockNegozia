import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { AccountsModule } from "./accounts/accounts.module";
import { AdminAuthModule } from "./admin-auth/admin-auth.module";
import { appConfig } from "./config/configuration";
import { CreditConfigModule } from "./credit-config/credit-config.module";
import { CreditsModule } from "./credits/credits.module";
import { DatabaseModule } from "./database/database.module";
import { GamificationModule } from "./gamification/gamification.module";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),
    EventEmitterModule.forRoot(),
    DatabaseModule,
    HealthModule,
    AdminAuthModule,
    CreditConfigModule,
    AccountsModule,
    CreditsModule,
    GamificationModule,
  ],
})
export class AppModule {}
