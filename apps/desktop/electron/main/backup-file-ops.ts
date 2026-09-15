import { copyFileSync, existsSync, renameSync, rmSync } from "node:fs";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** `stocknegozia-backup-2026-09-14-18-42-00.db` (o `-pre-restore-`) — ver
 *  docs/backup/BACKUP_RESTORE.md §Formato del archivo. Sin dependencias de Electron: se puede
 *  testear directamente con Vitest, sin necesitar un proceso Electron real. */
export function buildBackupFileName(kind: "backup" | "pre-restore" = "backup"): string {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join("-");
  return `stocknegozia-${kind}-${stamp}.db`;
}

/**
 * Un archivo SQLite en modo WAL puede tener hasta dos archivos auxiliares (`-wal`, `-shm`) — estas
 * tres funciones siempre los mueven/copian/borran junto con el archivo principal, cuando existen,
 * para que el swap de Restore (ver backup-manager.ts) nunca deje un WAL huérfano apuntando a un
 * archivo principal que ya no está en esa ruta.
 */
const SIDECAR_SUFFIXES = ["-wal", "-shm"] as const;

export function moveDatabaseFiles(fromBase: string, toBase: string): void {
  for (const suffix of ["", ...SIDECAR_SUFFIXES]) {
    const from = fromBase + suffix;
    if (existsSync(from)) renameSync(from, toBase + suffix);
  }
}

export function copyDatabaseFiles(fromBase: string, toBase: string): void {
  copyFileSync(fromBase, toBase);
  for (const suffix of SIDECAR_SUFFIXES) {
    const from = fromBase + suffix;
    if (existsSync(from)) copyFileSync(from, toBase + suffix);
  }
}

export function deleteDatabaseFiles(base: string): void {
  for (const suffix of ["", ...SIDECAR_SUFFIXES]) {
    const file = base + suffix;
    if (existsSync(file)) rmSync(file, { force: true });
  }
}
