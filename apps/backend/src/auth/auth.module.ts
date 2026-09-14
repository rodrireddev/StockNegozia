import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AuthController } from "./auth.controller";
import { BootstrapTokenService } from "./bootstrap/bootstrap-token.service";
import { CredentialService } from "./credential/credential.service";
import { DevicesController } from "./devices/devices.controller";
import { DevicesRepository } from "./devices/devices.repository";
import { DevicesService } from "./devices/devices.service";
import { AdminDeviceGuard } from "./guards/admin-device.guard";
import { ApiAccessGuard } from "./guards/api-access.guard";

/**
 * Frontera de acceso a la API — ver docs/security/API_ACCESS.md. `ApiAccessGuard` se registra
 * como `APP_GUARD` (global): todo controller queda protegido por defecto en
 * `API_ACCESS_MODE=production`, salvo los que se marquen explícitamente con `@Public()`.
 * `AdminDeviceGuard` no es global — se aplica por ruta en `DevicesController` (ver
 * docs/security/DEVICE_MANAGEMENT.md).
 */
@Module({
  controllers: [AuthController, DevicesController],
  providers: [
    DevicesRepository,
    DevicesService,
    CredentialService,
    BootstrapTokenService,
    AdminDeviceGuard,
    { provide: APP_GUARD, useClass: ApiAccessGuard },
  ],
  exports: [DevicesService, CredentialService],
})
export class AuthModule {}
