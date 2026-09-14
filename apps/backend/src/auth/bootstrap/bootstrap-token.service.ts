import { Inject, Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService, ConfigType } from "@nestjs/config";
import { randomBytes } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { appConfig } from "../../config/configuration";
import { AppLogger } from "../../common/logger/app-logger.service";
import { DevicesService } from "../devices/devices.service";

const BOOTSTRAP_TOKEN_TTL_MS = 10 * 60 * 1000;
const BOOTSTRAP_FILE_NAME = "bootstrap.token";

/**
 * Resuelve el bootstrap del primer dispositivo (ver docs/security/API_ACCESS.md §Bootstrap):
 * mientras no exista ningún dispositivo activo, genera un secreto de instalación de un solo uso,
 * de vida corta, y lo escribe en un archivo dentro de `configDir` — el mismo `dataDir` que
 * Electron ya conoce (se lo inyecta al backend vía `STOCKNEGOZIA_DATA_DIR`), así que el proceso
 * Electron main puede leerlo sin ningún canal nuevo. Es explícitamente distinto de la credential
 * permanente del dispositivo: no es reutilizable, expira, y deja de emitirse en cuanto el primer
 * dispositivo queda registrado.
 */
@Injectable()
export class BootstrapTokenService implements OnApplicationBootstrap {
  private token: string | null = null;
  private expiresAt: number | null = null;
  private readonly filePath: string;

  // @Inject explícito: ver el comentario equivalente en GlobalExceptionFilter (esbuild/Vitest no
  // emite la metadata de tipos que la inyección automática de NestJS necesita).
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(DevicesService) private readonly devicesService: DevicesService,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {
    const config = this.configService.get<ConfigType<typeof appConfig>>("app")!;
    this.filePath = path.join(config.configDir, BOOTSTRAP_FILE_NAME);
  }

  onApplicationBootstrap(): void {
    if (this.devicesService.hasActiveDevice()) {
      this.clear();
      return;
    }
    this.issue();
  }

  /** Consume el token si es válido y no expiró — de un solo uso, se invalida se use o no. */
  consume(candidate: string): boolean {
    if (!this.token || !this.expiresAt || Date.now() > this.expiresAt || candidate !== this.token) {
      return false;
    }
    this.clear();
    return true;
  }

  private issue(): void {
    this.token = randomBytes(32).toString("base64url");
    this.expiresAt = Date.now() + BOOTSTRAP_TOKEN_TTL_MS;
    try {
      mkdirSync(path.dirname(this.filePath), { recursive: true });
      writeFileSync(this.filePath, this.token, { mode: 0o600 });
    } catch (error) {
      this.logger.error({
        context: "BootstrapTokenService",
        operation: "issue",
        event: "auth.bootstrap.failed",
        message: "No se pudo persistir el token de bootstrap",
        error,
      });
    }
  }

  private clear(): void {
    this.token = null;
    this.expiresAt = null;
    try {
      rmSync(this.filePath, { force: true });
    } catch {
      // best-effort — si el archivo ya no existe o no se puede borrar, no es crítico:
      // el token en memoria ya quedó invalidado.
    }
  }
}
