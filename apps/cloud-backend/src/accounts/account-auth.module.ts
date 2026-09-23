import { Module } from "@nestjs/common";
import { ConfigService, ConfigType } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PasswordService } from "../common/password.service";
import { appConfig } from "../config/configuration";
import { ACCOUNT_SESSION_TTL_SECONDS } from "./account-auth.constants";
import { AccountJwtGuard } from "./account-jwt.guard";
import { UsersRepository } from "./users.repository";

/**
 * Solo el JWT + repo de `users` — separado de `AccountsModule` (register/login/me, que además
 * necesita `CreditsModule` para la bienvenida) para que `CreditsModule` y `GamificationModule`
 * puedan usar el guard/repo sin crear una dependencia circular (mismo criterio que
 * `AdminAuthModule` vs `CreditConfigModule`).
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const config = configService.get<ConfigType<typeof appConfig>>("app")!;
        return {
          secret: config.accountJwtSecret,
          signOptions: { expiresIn: ACCOUNT_SESSION_TTL_SECONDS },
        };
      },
    }),
  ],
  providers: [UsersRepository, PasswordService, AccountJwtGuard],
  exports: [UsersRepository, PasswordService, AccountJwtGuard, JwtModule],
})
export class AccountAuthModule {}
