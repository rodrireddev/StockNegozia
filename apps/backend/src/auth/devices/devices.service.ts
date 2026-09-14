import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { AppLogger } from "../../common/logger/app-logger.service";
import { CredentialService } from "../credential/credential.service";
import { DevicesRepository } from "./devices.repository";
import type { AuthenticatedDevice, DeviceType } from "./devices.types";

/**
 * `lastSeenAt` no se actualiza en cada request autenticado (sería una escritura a SQLite por
 * request) sino a lo sumo una vez por este intervalo — ver `touchLastSeen`.
 */
const LAST_SEEN_THROTTLE_MS = 60_000;

@Injectable()
export class DevicesService {
  // @Inject explícito en todos los parámetros: la inyección automática por tipo de NestJS depende
  // de metadata que `tsc` emite pero esbuild (usado por Vitest) no — ver el mismo comentario en
  // GlobalExceptionFilter.
  constructor(
    @Inject(DevicesRepository) private readonly repository: DevicesRepository,
    @Inject(CredentialService) private readonly credentialService: CredentialService,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  hasActiveDevice(): boolean {
    return this.repository.countActive() > 0;
  }

  register(name: string, type: DeviceType): { deviceId: string; credential: string } {
    const { credential, credentialHash } = this.credentialService.generate();
    const id = randomUUID();
    this.repository.insert({ id, name, type, credentialHash });
    this.logger.info({
      context: "DevicesService",
      operation: "register",
      event: "device.created",
      message: "Device created",
      metadata: { deviceId: id, deviceType: type },
    });
    return { deviceId: id, credential };
  }

  /**
   * Busca el dispositivo dueño de una credential, sin importar su status — el llamador (el guard)
   * decide qué hacer con un dispositivo revocado. Devuelve `undefined` tanto si la credential no
   * existe como si nunca existió: distinguir esos dos casos no le corresponde a este método.
   */
  findByCredential(rawCredential: string): AuthenticatedDevice | undefined {
    const credentialHash = this.credentialService.hash(rawCredential);
    const row = this.repository.findByCredentialHash(credentialHash);
    if (!row) return undefined;
    return { id: row.id, name: row.name, status: row.status, lastSeenAt: row.lastSeenAt };
  }

  touchLastSeen(deviceId: string, lastSeenAt: Date | null): void {
    const now = Date.now();
    if (lastSeenAt && now - lastSeenAt.getTime() < LAST_SEEN_THROTTLE_MS) return;
    this.repository.updateLastSeen(deviceId, new Date(now));
  }

  /**
   * Revoca un dispositivo — a partir de ahora su credential deja de autenticar. No expone todavía
   * un endpoint HTTP (no hay UI de administración en este milestone); queda preparado a nivel de
   * servicio para usarse desde una futura pantalla de administración de dispositivos.
   */
  revoke(deviceId: string): void {
    this.repository.updateStatus(deviceId, "revoked");
    this.logger.info({
      context: "DevicesService",
      operation: "revoke",
      event: "auth.device.revoked",
      message: "Device revoked",
      metadata: { deviceId },
    });
  }
}
