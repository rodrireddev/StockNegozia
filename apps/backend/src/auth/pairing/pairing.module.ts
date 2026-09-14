import { Module } from "@nestjs/common";
import { AuthModule } from "../auth.module";
import { PairingController } from "./pairing.controller";
import { PairingRepository } from "./pairing.repository";
import { PairingService } from "./pairing.service";

/**
 * Importa `AuthModule` para reutilizar `CredentialService` (hash genérico) y `DevicesService`
 * (creación de Device + credential) — ver docs/security/PAIRING.md. No duplica infraestructura de
 * credenciales; solo agrega el ciclo de vida de la sesión de pairing (QR + código) en su propia
 * tabla (`pairing_sessions`).
 */
@Module({
  imports: [AuthModule],
  controllers: [PairingController],
  providers: [PairingRepository, PairingService],
  exports: [PairingService],
})
export class PairingModule {}
