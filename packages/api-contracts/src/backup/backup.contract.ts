/**
 * Backup/Restore — ver docs/backup/BACKUP_RESTORE.md. El backend es la única capa que sabe crear
 * o validar un backup (tiene la conexión SQLite); Electron Main coordina diálogos nativos y el
 * lifecycle del proceso backend; el Renderer nunca ve una ruta de archivo.
 */
export interface BackupResultDto {
  fileName: string;
  filePath: string;
  createdAt: string;
  sizeBytes: number;
}

/**
 * `not_sqlite` cubre tanto "no es un archivo SQLite" como "no se pudo abrir" (misma causa raíz
 * desde la perspectiva del usuario). `incompatible_older`/`incompatible_newer` comparan contra las
 * migraciones Drizzle ya aplicadas en esta instalación — ver §Compatibilidad de schema.
 */
export type BackupValidationStatus =
  | "valid"
  | "not_found"
  | "not_sqlite"
  | "corrupt"
  | "missing_tables"
  | "incompatible_older"
  | "incompatible_newer";

export interface BackupValidationResultDto {
  status: BackupValidationStatus;
  /** Mensaje ya listo para mostrar al usuario, en español — ver docs/backup/BACKUP_RESTORE.md §Errores. */
  message: string;
  fileName: string;
  /** Fecha de modificación del archivo (metadata del filesystem) — nunca inventada. */
  createdAt: string | null;
  /** Cantidad de migraciones Drizzle aplicadas en el archivo — null si no se pudo determinar (ej. `not_sqlite`). */
  migrationCount: number | null;
}
