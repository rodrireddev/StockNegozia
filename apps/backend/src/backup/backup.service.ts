import { Inject, Injectable, InternalServerErrorException } from "@nestjs/common";
import type {
  BackupResultDto,
  BackupValidationResultDto,
  BackupValidationStatus,
} from "@stocknegozia/api-contracts";
import RawDatabase from "better-sqlite3";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { AppLogger } from "../common/logger/app-logger.service";
import { DRIZZLE_CLIENT } from "../database/database.constants";
import {
  getRawSqliteClient,
  type Database,
  type RawSqliteConnection,
} from "../database/database.types";

/**
 * Subconjunto de tablas de negocio que identifican a un backup como "de StockNegozia" — ver
 * docs/backup/BACKUP_RESTORE.md §Validación. Deliberadamente no incluye `devices`/
 * `pairing_sessions` (auth): un backup de datos de negocio sigue siendo válido aunque su historial
 * de dispositivos difiera del de esta instalación — ver docs/backup/BACKUP_RESTORE.md §Qué NO
 * protege este sistema todavía.
 */
const ESSENTIAL_TABLES = [
  "products",
  "categories",
  "suppliers",
  "purchases",
  "purchase_items",
  "sales",
  "sale_items",
  "stock_movements",
] as const;

/** Tabla que Drizzle crea y mantiene automáticamente al migrar — ver
 *  drizzle-orm/sqlite-core/dialect.ts. Reutilizada tal cual como mecanismo de versionado de
 *  schema: no se inventa un sistema de versionado paralelo. */
const MIGRATIONS_TABLE = "__drizzle_migrations";

interface CurrentSchemaState {
  migrationCount: number;
  latestMigrationWhen: number;
}

interface MigrationJournal {
  entries: { when: number }[];
}

function readCurrentSchemaState(): CurrentSchemaState {
  // Mismo criterio de resolución de ruta que `DatabaseModule` para el folder de migraciones: desde
  // el árbol fuente (no `dist/`), ver database.module.ts.
  const journalPath = path.join(process.cwd(), "src/database/migrations/meta/_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf-8")) as MigrationJournal;
  const lastEntry = journal.entries.at(-1);
  return {
    migrationCount: journal.entries.length,
    latestMigrationWhen: lastEntry?.when ?? 0,
  };
}

@Injectable()
export class BackupService {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: Database,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Crea un backup consistente de la base de datos ACTUAL (en uso) sin detener la aplicación ni
   * cambiar su configuración — usa la SQLite Online Backup API a través de `better-sqlite3`
   * (`Database.prototype.backup()`), que maneja WAL correctamente por sí sola: no hace falta
   * cambiar `journal_mode` ni hacer un checkpoint manual. Ver docs/backup/BACKUP_RESTORE.md
   * §Estrategia SQLite.
   */
  async create(destinationPath: string): Promise<BackupResultDto> {
    const operation = "createBackup";
    this.logger.info({
      context: "BackupService",
      operation,
      event: "backup.started",
      message: "Creating backup",
      metadata: { filePath: destinationPath },
    });

    try {
      mkdirSync(path.dirname(destinationPath), { recursive: true });

      const client = getRawSqliteClient(this.db);
      await client.backup(destinationPath);

      // No confiar en que `.backup()` no lanzó — reabrir el archivo generado y correr la misma
      // validación que se le exige a cualquier backup antes de aceptarlo (ver Parte 8, punto 3).
      const verification = this.inspectCandidate(destinationPath);
      if (verification.status !== "valid") {
        throw new Error(`El backup generado no pasó la verificación (${verification.status})`);
      }

      const stats = statSync(destinationPath);
      const result: BackupResultDto = {
        fileName: path.basename(destinationPath),
        filePath: destinationPath,
        createdAt: stats.mtime.toISOString(),
        sizeBytes: stats.size,
      };

      this.logger.info({
        context: "BackupService",
        operation,
        event: "backup.completed",
        message: "Backup created successfully",
        metadata: { filePath: destinationPath, sizeBytes: result.sizeBytes },
      });
      return result;
    } catch (error) {
      this.logger.error({
        context: "BackupService",
        operation,
        event: "backup.failed",
        message: "Backup creation failed",
        metadata: { filePath: destinationPath },
        error,
      });
      throw new InternalServerErrorException(
        "No se pudo crear el backup. Verificá que la ubicación seleccionada tenga permisos de escritura.",
      );
    }
  }

  /**
   * Valida un archivo candidato a restore — nunca escribe en él (conexión `readonly`), y nunca
   * toca la base de datos en uso. Ver docs/backup/BACKUP_RESTORE.md §Validación para el detalle de
   * cada chequeo y por qué está en ese orden.
   */
  validate(filePath: string): BackupValidationResultDto {
    const operation = "validateBackup";
    this.logger.info({
      context: "BackupService",
      operation,
      event: "restore.validation_started",
      message: "Validating candidate backup",
      metadata: { filePath },
    });

    const result = this.inspectCandidate(filePath);

    if (result.status === "valid") {
      this.logger.info({
        context: "BackupService",
        operation,
        event: "restore.validation_completed",
        message: "Candidate backup is valid",
        metadata: { filePath, migrationCount: result.migrationCount },
      });
    } else {
      this.logger.warn({
        context: "BackupService",
        operation,
        event: "restore.validation_failed",
        message: "Candidate backup failed validation",
        metadata: { filePath, status: result.status },
      });
    }

    return result;
  }

  private buildResult(
    status: BackupValidationStatus,
    message: string,
    fileName: string,
    createdAt: string | null,
    migrationCount: number | null,
  ): BackupValidationResultDto {
    return { status, message, fileName, createdAt, migrationCount };
  }

  private inspectCandidate(filePath: string): BackupValidationResultDto {
    const fileName = path.basename(filePath);

    if (!existsSync(filePath)) {
      return this.buildResult(
        "not_found",
        "No se encontró el archivo seleccionado.",
        fileName,
        null,
        null,
      );
    }

    const stats = statSync(filePath);
    const createdAt = stats.mtime.toISOString();

    let candidate: RawSqliteConnection;
    try {
      candidate = new RawDatabase(filePath, { readonly: true, fileMustExist: true });
    } catch {
      return this.buildResult(
        "not_sqlite",
        "El archivo seleccionado no es un backup válido de StockNegozia.",
        fileName,
        createdAt,
        null,
      );
    }

    try {
      // SQLite abre perezosamente: un archivo que no es una base de datos (o cuyo header no es
      // válido) recién lanza al primer acceso real, no en el constructor — por eso el chequeo de
      // "no es SQLite" también vive acá, envolviendo el primer PRAGMA/query real.
      let integrityRows: { integrity_check: string }[];
      try {
        integrityRows = candidate.pragma("integrity_check") as { integrity_check: string }[];
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        // "file is not a database" es el mensaje exacto de SQLite para un archivo cuyo header no
        // es el de SQLite — cualquier otro error en esta etapa (ej. "database disk image is
        // malformed") es un archivo SQLite real pero dañado.
        if (message.includes("file is not a database")) {
          return this.buildResult(
            "not_sqlite",
            "El archivo seleccionado no es un backup válido de StockNegozia.",
            fileName,
            createdAt,
            null,
          );
        }
        return this.buildResult(
          "corrupt",
          "El backup está dañado y no puede restaurarse.",
          fileName,
          createdAt,
          null,
        );
      }

      const isHealthy = integrityRows.length === 1 && integrityRows[0]?.integrity_check === "ok";
      if (!isHealthy) {
        return this.buildResult(
          "corrupt",
          "El backup está dañado y no puede restaurarse.",
          fileName,
          createdAt,
          null,
        );
      }

      const tableRows = candidate
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
        .all() as { name: string }[];
      const tableNames = new Set(tableRows.map((row) => row.name));

      const hasEssentialTables = ESSENTIAL_TABLES.every((table) => tableNames.has(table));
      if (!hasEssentialTables || !tableNames.has(MIGRATIONS_TABLE)) {
        return this.buildResult(
          "missing_tables",
          "El archivo seleccionado no es un backup válido de StockNegozia.",
          fileName,
          createdAt,
          null,
        );
      }

      const migrationRow = candidate
        .prepare(`SELECT COUNT(*) as count, MAX(created_at) as latest FROM ${MIGRATIONS_TABLE}`)
        .get() as { count: number; latest: number | null };

      const current = readCurrentSchemaState();

      if (migrationRow.latest === current.latestMigrationWhen) {
        return this.buildResult(
          "valid",
          "Backup válido y compatible con esta versión de StockNegozia.",
          fileName,
          createdAt,
          migrationRow.count,
        );
      }
      if ((migrationRow.latest ?? 0) > current.latestMigrationWhen) {
        return this.buildResult(
          "incompatible_newer",
          "Este backup pertenece a una versión más nueva de StockNegozia y no puede restaurarse en esta instalación.",
          fileName,
          createdAt,
          migrationRow.count,
        );
      }
      return this.buildResult(
        "incompatible_older",
        "Este backup pertenece a una versión anterior de StockNegozia y no es compatible con esta instalación.",
        fileName,
        createdAt,
        migrationRow.count,
      );
    } finally {
      candidate.close();
    }
  }
}
