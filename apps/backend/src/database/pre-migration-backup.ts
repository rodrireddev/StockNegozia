import type Database from "better-sqlite3";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";

/** Cuántos respaldos "pre-update" se conservan (los más viejos se borran). */
export const PRE_UPDATE_BACKUPS_TO_KEEP = 5;

const PRE_UPDATE_PREFIX = "stocknegozia-pre-update-";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function buildPreUpdateFileName(now: Date): string {
  const stamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join("-");
  return `${PRE_UPDATE_PREFIX}${stamp}.db`;
}

/**
 * Cantidad de migraciones que todavía no se aplicaron a esta base. Una base nueva (sin la tabla de
 * drizzle) devuelve 0: no hay datos que respaldar. Mismo criterio que el migrator de drizzle
 * (compara `created_at` de la última migración aplicada contra el `when` del journal).
 */
export function countPendingMigrations(
  sqlite: Database.Database,
  migrationsFolder: string,
): number {
  const table = sqlite
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations'",
    )
    .get();
  if (!table) return 0;

  const last = sqlite
    .prepare("SELECT created_at FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 1")
    .get() as { created_at: number | string } | undefined;
  if (!last) return 0;

  const lastApplied = Number(last.created_at);
  return readMigrationFiles({ migrationsFolder }).filter(
    (migration) => migration.folderMillis > lastApplied,
  ).length;
}

/**
 * Al actualizar la app (instalador nuevo sobre una versión anterior) la base del usuario se migra
 * sola al arrancar el backend. Antes de tocarla se guarda una copia completa en
 * `<dataDir>/backups/pre-update/` — si una migración falla, drizzle hace ROLLBACK, pero esta copia
 * es la red de seguridad ante cualquier otro problema. Devuelve la ruta del respaldo, o `null` si
 * no hacía falta (base nueva o ya al día).
 */
export function backupBeforeMigrations(
  sqlite: Database.Database,
  options: { migrationsFolder: string; backupsDir: string; now?: Date },
): string | null {
  if (countPendingMigrations(sqlite, options.migrationsFolder) === 0) return null;

  mkdirSync(options.backupsDir, { recursive: true });
  const target = path.join(options.backupsDir, buildPreUpdateFileName(options.now ?? new Date()));
  // `VACUUM INTO` genera una copia consistente (incluye lo que está en el WAL) en un solo archivo.
  sqlite.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);

  pruneOldBackups(options.backupsDir);
  return target;
}

function pruneOldBackups(backupsDir: string): void {
  const files = readdirSync(backupsDir)
    .filter((name) => name.startsWith(PRE_UPDATE_PREFIX) && name.endsWith(".db"))
    .sort()
    .reverse();
  for (const name of files.slice(PRE_UPDATE_BACKUPS_TO_KEEP)) {
    rmSync(path.join(backupsDir, name), { force: true });
  }
}
