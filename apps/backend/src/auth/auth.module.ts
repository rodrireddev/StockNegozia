import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AuthController } from "./auth.controller";
import { BootstrapTokenService } from "./bootstrap/bootstrap-token.service";
import { CredentialService } from "./credential/credential.service";
import { DevicesRepository } from "./devices/devices.repository";
import { DevicesService } from "./devices/devices.service";
import { ApiAccessGuard } from "./guards/api-access.guard";

/**
 * Frontera de acceso a la API — ver docs/security/API_ACCESS.md. `ApiAccessGuard` se registra
 * como `APP_GUARD` (global): todo controller queda protegido por defecto en
 * `API_ACCESS_MODE=production`, salvo los que se marquen explícitamente con `@Public()`.
 */
@Module({
  controllers: [AuthController],
  providers: [
    DevicesRepository,
    DevicesService,
    CredentialService,
    BootstrapTokenService,
    { provide: APP_GUARD, useClass: ApiAccessGuard },
  ],
  exports: [DevicesService],
})
export class AuthModule {}
