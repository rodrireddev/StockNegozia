import { Module } from "@nestjs/common";
import { ConfigService, ConfigType } from "@nestjs/config";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { appConfig } from "../config/configuration";
import { ADMIN_JWT_SERVICE, ADMIN_SESSION_TTL_SECONDS } from "./admin-auth.constants";
import { AdminAuthController } from "./admin-auth.controller";
import { AdminAuthService } from "./admin-auth.service";
import { AdminJwtGuard } from "./admin-jwt.guard";
import { PasswordService } from "../common/password.service";
import { AdminUsersRepository } from "./admin-users.repository";

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const config = configService.get<ConfigType<typeof appConfig>>("app")!;
        return {
          secret: config.adminJwtSecret,
          signOptions: { expiresIn: ADMIN_SESSION_TTL_SECONDS },
        };
      },
    }),
  ],
  controllers: [AdminAuthController],
  providers: [
    AdminAuthService,
    AdminUsersRepository,
    PasswordService,
    AdminJwtGuard,
    { provide: ADMIN_JWT_SERVICE, useExisting: JwtService },
  ],
  exports: [AdminJwtGuard, ADMIN_JWT_SERVICE],
})
export class AdminAuthModule {}
