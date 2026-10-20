import { Inject, Injectable, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { ConfigService, ConfigType } from "@nestjs/config";
import { existsSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { AppLogger } from "../common/logger/app-logger.service";
import { appConfig } from "../config/configuration";
import { BackupService } from "./backup.service";

const KEEP_DAYS = 7;
const CHECK_INTERVAL_MS = 60 * 60 * 1000;
const FILE_PATTERN = /^auto-\d{4}-\d{2}-\d{2}\.db$/;

/**
 * Backup diario automático en `<dataDir>/backups/auto/auto-YYYY-MM-DD.db`, reusando
 * `BackupService.create()` (misma Online Backup API + verificación). Chequea cada hora en vez de
 * agendar a una hora fija: la app de escritorio puede estar cerrada a esa hora, así que el backup
 * del día se hace la primera vez que el backend está levantado ese día. Conserva los últimos
 * `KEEP_DAYS` — mismo disco que la base, así que protege contra errores del usuario/corrupción,
 * no contra la pérdida del disco (para eso sigue el backup manual a otra ubicación).
 */
@Injectable()
export class AutoBackupService implements OnApplicationBootstrap, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;
  private readonly dir: string;
  private readonly enabled: boolean;

  constructor(
    @Inject(ConfigService) configService: ConfigService,
    @Inject(BackupService) private readonly backupService: BackupService,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {
    const config = configService.get<ConfigType<typeof appConfig>>("app")!;
    this.dir = path.join(config.dataDir, "backups", "auto");
    this.enabled = config.nodeEnv !== "test";
  }

  onApplicationBootstrap(): void {
    if (!this.enabled) return;
    void this.run();
    this.timer = setInterval(() => void this.run(), CHECK_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** Devuelve la ruta del backup creado, o `null` si el de hoy ya existía o falló. */
  async run(now = new Date()): Promise<string | null> {
    const day = now.toISOString().slice(0, 10);
    const filePath = path.join(this.dir, `auto-${day}.db`);
    try {
      if (existsSync(filePath)) return null;
      await this.backupService.create(filePath);
      this.prune();
      return filePath;
    } catch (error) {
      // `BackupService.create()` ya loguea el detalle; acá solo se evita tumbar el proceso.
      this.logger.warn({
        context: "AutoBackupService",
        operation: "autoBackup",
        event: "backup.auto_failed",
        message: "Automatic backup failed",
        metadata: { filePath },
        error,
      });
      return null;
    }
  }

  private prune(): void {
    const files = readdirSync(this.dir)
      .filter((name) => FILE_PATTERN.test(name))
      .sort();
    for (const name of files.slice(0, -KEEP_DAYS)) {
      rmSync(path.join(this.dir, name), { force: true });
    }
  }
}
