import { Module } from "@nestjs/common";
import { ConfigService, ConfigType } from "@nestjs/config";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { EmailService } from "../common/email.service";
import { PasswordService } from "../common/password.service";
import { appConfig } from "../config/configuration";
import { ACCOUNT_JWT_SERVICE, ACCOUNT_SESSION_TTL_SECONDS } from "./account-auth.constants";
import { AccountJwtGuard } from "./account-jwt.guard";
import { AccountJwtService } from "./account-jwt.service";
import { AccountTokensRepository } from "./account-tokens.repository";
import { AccountTokensService } from "./account-tokens.service";
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
  providers: [
    UsersRepository,
    PasswordService,
    AccountJwtGuard,
    AccountJwtService,
    AccountTokensRepository,
    AccountTokensService,
    EmailService,
    { provide: ACCOUNT_JWT_SERVICE, useExisting: JwtService },
  ],
  exports: [
    UsersRepository,
    PasswordService,
    AccountJwtGuard,
    AccountJwtService,
    AccountTokensService,
    EmailService,
    ACCOUNT_JWT_SERVICE,
  ],
})
export class AccountAuthModule {}
