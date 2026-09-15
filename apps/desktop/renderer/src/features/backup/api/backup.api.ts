/**
 * A diferencia de toda otra feature, esto no llama a `apiGet`/`apiPost` (no es HTTP al backend
 * directamente) — pasa por `window.backup.*` (IPC vía preload, ver
 * apps/desktop/electron/preload/index.ts). Electron Main es quien de verdad llama al backend con
 * la ruta que el propio usuario eligió en un diálogo nativo; el Renderer nunca ve esa ruta. Ver
 * docs/backup/BACKUP_RESTORE.md §Seguridad.
 */
export function createBackup() {
  return window.backup.create();
}

export function selectAndValidateBackup() {
  return window.backup.selectAndValidate();
}

export function restoreBackup() {
  return window.backup.restore();
}
