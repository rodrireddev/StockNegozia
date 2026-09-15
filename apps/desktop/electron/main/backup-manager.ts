import type { BackupResultDto, BackupValidationResultDto } from "@stocknegozia/api-contracts";
import { app, BrowserWindow, dialog } from "electron";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { buildBackupFileName, copyDatabaseFiles, deleteDatabaseFiles, moveDatabaseFiles } from "./backup-file-ops";
import type { BackendManager } from "./backend-manager";
import type { DeviceCredentialStore } from "./device-credential-store";

export type CreateBackupOutcome =
  | { cancelled: true }
  | { cancelled: false; result: BackupResultDto }
  | { cancelled: false; error: string };

export type SelectAndValidateOutcome =
  | { cancelled: true }
  | { cancelled: false; validation: BackupValidationResultDto }
  | { cancelled: false; error: string };

export type RestoreOutcome =
  | { success: true; preRestoreBackupFileName: string }
  | { success: false; error: string };

const GENERIC_RESTORE_FAILURE =
  "No se pudo completar la restauración. Los datos anteriores se conservaron.";

/**
 * Coordina Backup/Restore desde Electron Main — el único lugar con permiso para: mostrar
 * diálogos nativos de archivo, pedirle al backend que cree/valide un backup (vía HTTP, con la
 * credential del propio dispositivo), y — solo para Restore — parar/arrancar el backend y
 * reemplazar el archivo de SQLite en disco. El Renderer nunca ve una ruta de archivo; ver
 * docs/backup/BACKUP_RESTORE.md §Seguridad.
 */
export class BackupManager {
  private selectedRestorePath: string | null = null;

  constructor(
    private readonly backendManager: BackendManager,
    private readonly credentialStore: DeviceCredentialStore,
    private readonly dataDir: string,
    private readonly getMainWindow: () => BrowserWindow | null,
  ) {}

  private authHeaders(): Record<string, string> {
    const stored = this.credentialStore.load();
    return stored ? { Authorization: `Bearer ${stored.credential}` } : {};
  }

  private async postJson<T>(pathname: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.backendManager.baseUrl}${pathname}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...this.authHeaders() },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(errorBody?.message ?? `Request to ${pathname} failed with status ${response.status}`);
    }
    return response.json() as Promise<T>;
  }

  private liveDatabasePath(): string {
    return path.join(this.dataDir, "database", "stocknegozia.sqlite");
  }

  private backupsDir(): string {
    return path.join(this.dataDir, "backups");
  }

  async createBackup(): Promise<CreateBackupOutcome> {
    const window = this.getMainWindow();
    const defaultFileName = buildBackupFileName();
    const dialogResult = await dialog.showSaveDialog(window ?? (undefined as unknown as BrowserWindow), {
      title: "Guardar backup de StockNegozia",
      defaultPath: path.join(app.getPath("documents"), defaultFileName),
      filters: [{ name: "Backup de StockNegozia", extensions: ["db"] }],
    });

    if (dialogResult.canceled || !dialogResult.filePath) {
      return { cancelled: true };
    }

    try {
      const result = await this.postJson<BackupResultDto>("/backup", {
        destinationPath: dialogResult.filePath,
      });
      return { cancelled: false, result };
    } catch (error) {
      return {
        cancelled: false,
        error:
          error instanceof Error
            ? error.message
            : "No se pudo crear el backup. Verificá que la ubicación seleccionada tenga permisos de escritura.",
      };
    }
  }

  async selectAndValidateRestoreFile(): Promise<SelectAndValidateOutcome> {
    const window = this.getMainWindow();
    const dialogResult = await dialog.showOpenDialog(window ?? (undefined as unknown as BrowserWindow), {
      title: "Seleccionar backup de StockNegozia",
      properties: ["openFile"],
      filters: [{ name: "Backup de StockNegozia", extensions: ["db"] }],
    });

    if (dialogResult.canceled || dialogResult.filePaths.length === 0) {
      return { cancelled: true };
    }

    const filePath = dialogResult.filePaths[0]!;
    this.selectedRestorePath = filePath;

    try {
      const validation = await this.postJson<BackupValidationResultDto>("/backup/validate", { filePath });
      return { cancelled: false, validation };
    } catch (error) {
      this.selectedRestorePath = null;
      return {
        cancelled: false,
        error: error instanceof Error ? error.message : "No se pudo validar el archivo seleccionado.",
      };
    }
  }

  /**
   * Ver docs/backup/BACKUP_RESTORE.md §Arquitectura de Restore para el diagrama completo. Cada
   * paso puede fallar de forma segura: nada reemplaza la base actual hasta que el backup de
   * seguridad y la validación ya se confirmaron, y cualquier fallo después de tocar el archivo
   * dispara un rollback antes de reportar el error.
   */
  async restoreSelectedFile(): Promise<RestoreOutcome> {
    const candidatePath = this.selectedRestorePath;
    if (!candidatePath) {
      return { success: false, error: "No hay ningún backup seleccionado para restaurar." };
    }

    // 1. Revalidar — defensa en profundidad: el archivo pudo cambiar/borrarse entre la selección
    //    y la confirmación explícita del usuario.
    let revalidation: BackupValidationResultDto;
    try {
      revalidation = await this.postJson<BackupValidationResultDto>("/backup/validate", {
        filePath: candidatePath,
      });
    } catch {
      return { success: false, error: GENERIC_RESTORE_FAILURE };
    }
    if (revalidation.status !== "valid") {
      return { success: false, error: revalidation.message };
    }

    const backupsDir = this.backupsDir();
    mkdirSync(backupsDir, { recursive: true });
    const preRestorePath = path.join(backupsDir, buildBackupFileName("pre-restore"));

    // 2. Backup de seguridad de la base ACTUAL — con el backend todavía corriendo (API de backup
    //    online, no requiere detener nada). Si esto falla, no se continúa: nunca se restaura sin
    //    red de seguridad (ver Parte 12).
    try {
      await this.postJson<BackupResultDto>("/backup", { destinationPath: preRestorePath });
    } catch {
      return {
        success: false,
        error: "No se pudo crear el backup de seguridad de los datos actuales. La restauración no continuó.",
      };
    }

    // 3. Detener el backend, esperando confirmación real de que el proceso salió (libera el
    //    archivo de SQLite) — nunca reemplazar el archivo sin esa certeza.
    const stoppedCleanly = await this.backendManager.stop();
    if (!stoppedCleanly) {
      return { success: false, error: GENERIC_RESTORE_FAILURE };
    }

    // 4. Swap atómico con posibilidad de rollback (ver Parte 13).
    const liveDbPath = this.liveDatabasePath();
    const swapAsidePath = `${liveDbPath}.swap-backup`;

    try {
      moveDatabaseFiles(liveDbPath, swapAsidePath);
      copyDatabaseFiles(candidatePath, liveDbPath);

      this.backendManager.start();
      await this.backendManager.waitUntilHealthy();

      // Éxito confirmado por /health — el backup de seguridad (paso 2) ya quedó en `backups/`;
      // los archivos de swap temporales ya no hacen falta.
      deleteDatabaseFiles(swapAsidePath);

      this.selectedRestorePath = null;
      return { success: true, preRestoreBackupFileName: path.basename(preRestorePath) };
    } catch {
      await this.rollback(liveDbPath, swapAsidePath);
      return { success: false, error: GENERIC_RESTORE_FAILURE };
    }
  }

  private async rollback(liveDbPath: string, swapAsidePath: string): Promise<void> {
    try {
      deleteDatabaseFiles(liveDbPath);
      moveDatabaseFiles(swapAsidePath, liveDbPath);
      this.backendManager.start();
      await this.backendManager.waitUntilHealthy();
    } catch {
      // Si ni el rollback puede levantar el backend, no hay nada más seguro que intentar acá de
      // forma automática — ver docs/backup/BACKUP_RESTORE.md §Qué NO protege este sistema todavía.
    }
  }
}
