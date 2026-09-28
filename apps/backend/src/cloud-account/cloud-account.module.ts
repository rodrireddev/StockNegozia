import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CloudAccountController } from "./cloud-account.controller";
import { CloudSessionService } from "./cloud-session.service";

/**
 * Importa `AuthModule` para que `AdminDeviceGuard` (referenciado por clase en
 * `CloudAccountController`) resuelva sus propias dependencias (`ConfigService`/`AppLogger`, ambos
 * globales) sin ambigüedad — mismo criterio que `PairingModule`.
 */
@Module({
  imports: [AuthModule],
  controllers: [CloudAccountController],
  providers: [CloudSessionService],
})
export class CloudAccountModule {}
