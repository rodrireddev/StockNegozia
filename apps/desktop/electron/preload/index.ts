import { contextBridge, ipcRenderer } from "electron";
import { DEFAULT_BACKEND_PORT } from "@stocknegozia/shared";
import type {
  CreateBackupOutcome,
  RestoreOutcome,
  SelectAndValidateOutcome,
} from "../main/backup-manager";
import type { ThemePreference } from "../main/preferences-store";
import type { ThemeStatus } from "../main/theme-controller";

const backendPort = Number(process.env["STOCKNEGOZIA_PORT"]) || DEFAULT_BACKEND_PORT;

const stockNegoziaApi = {
  backendBaseUrl: `http://localhost:${backendPort}`,
  versions: process.versions,
};

contextBridge.exposeInMainWorld("stockNegozia", stockNegoziaApi);

/**
 * Superficie mínima y específica para Backup/Restore — nunca una API de filesystem genérica (ver
 * docs/backup/BACKUP_RESTORE.md §Seguridad). Ningún método recibe ni devuelve una ruta de
 * archivo completa: Electron Main la resuelve internamente (diálogo nativo) y solo comunica
 * resultados ya procesados.
 */
const backupApi = {
  create: (): Promise<CreateBackupOutcome> => ipcRenderer.invoke("backup:create"),
  selectAndValidate: (): Promise<SelectAndValidateOutcome> =>
    ipcRenderer.invoke("backup:selectAndValidate"),
  restore: (): Promise<RestoreOutcome> => ipcRenderer.invoke("backup:restore"),
};

contextBridge.exposeInMainWorld("backup", backupApi);

/**
 * Superficie mínima para Dark Mode — el Renderer nunca decide `prefers-color-scheme` por su
 * cuenta: `nativeTheme` en Electron Main es la única fuente de verdad (ver
 * docs/desktop/THEME.md), así que acá solo se expone leer/cambiar la preferencia y suscribirse a
 * cambios (el SO puede cambiar de tema mientras la app está abierta con `theme = "system"`).
 */
const themeApi = {
  get: (): Promise<ThemeStatus> => ipcRenderer.invoke("theme:get"),
  set: (preference: ThemePreference): Promise<ThemeStatus> =>
    ipcRenderer.invoke("theme:set", preference),
  onUpdated: (callback: (resolvedDark: boolean) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, resolvedDark: boolean) =>
      callback(resolvedDark);
    ipcRenderer.on("theme:updated", listener);
    return () => ipcRenderer.removeListener("theme:updated", listener);
  },
};

contextBridge.exposeInMainWorld("theme", themeApi);

export type StockNegoziaApi = typeof stockNegoziaApi;
export type BackupApi = typeof backupApi;
export type ThemeApi = typeof themeApi;
export type { ThemePreference, ThemeStatus };
