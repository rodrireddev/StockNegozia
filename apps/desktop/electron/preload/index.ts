import { contextBridge, ipcRenderer } from "electron";
import { DEFAULT_BACKEND_PORT } from "@stocknegozia/shared";
import type {
  CreateBackupOutcome,
  RestoreOutcome,
  SelectAndValidateOutcome,
} from "../main/backup-manager";
import type { ThemePreference } from "../main/preferences-store";
import type { DownloadReceiptOutcome } from "../main/receipt-manager";
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
 * Superficie mínima para el recibo PDF de una venta — mismo criterio que Backup: el PDF lo genera
 * siempre el backend, acá sólo se dispara la descarga y se recibe el resultado ya resuelto por
 * Electron Main (que es quien muestra el diálogo nativo y escribe el archivo).
 */
const receiptApi = {
  downloadSale: (saleId: number): Promise<DownloadReceiptOutcome> =>
    ipcRenderer.invoke("receipt:downloadSale", saleId),
};

contextBridge.exposeInMainWorld("receipt", receiptApi);

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

/**
 * Superficie mínima para la sesión de cuenta cloud (doc ADS_CREDITS_GAMIFICATION.md §6) — el JWT
 * vive cifrado en Electron Main (`CloudAccountCredentialStore`), nunca en `localStorage` del
 * renderer. `setToken`/`clearToken` también sincronizan el proxy `apps/backend` (ver
 * `electron/main/index.ts`), para que un `apps/mobile` emparejado vea el cambio en su próximo
 * poll de `/cloud-account/status`.
 */
const cloudAccountApi = {
  getToken: (): Promise<string | null> => ipcRenderer.invoke("cloudAccount:getToken"),
  setToken: (accessToken: string, expiresAt: string): Promise<void> =>
    ipcRenderer.invoke("cloudAccount:setToken", accessToken, expiresAt),
  clearToken: (): Promise<void> => ipcRenderer.invoke("cloudAccount:clearToken"),
};

contextBridge.exposeInMainWorld("cloudAccount", cloudAccountApi);

export type StockNegoziaApi = typeof stockNegoziaApi;
export type BackupApi = typeof backupApi;
export type ReceiptApi = typeof receiptApi;
export type ThemeApi = typeof themeApi;
export type CloudAccountApi = typeof cloudAccountApi;
export type { ThemePreference, ThemeStatus };
