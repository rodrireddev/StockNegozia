import { contextBridge, ipcRenderer } from "electron";
import { DEFAULT_BACKEND_PORT } from "@stocknegozia/shared";
import type { CreateBackupOutcome, RestoreOutcome, SelectAndValidateOutcome } from "../main/backup-manager";

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
  selectAndValidate: (): Promise<SelectAndValidateOutcome> => ipcRenderer.invoke("backup:selectAndValidate"),
  restore: (): Promise<RestoreOutcome> => ipcRenderer.invoke("backup:restore"),
};

contextBridge.exposeInMainWorld("backup", backupApi);

export type StockNegoziaApi = typeof stockNegoziaApi;
export type BackupApi = typeof backupApi;
