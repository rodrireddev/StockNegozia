export interface StockNegoziaApi {
  backendBaseUrl: string;
  versions: Record<string, string>;
}

/**
 * Espejo del contrato real definido en `apps/desktop/electron/preload/index.ts` — no se importa
 * directamente desde ahí porque el renderer y el proceso Electron main/preload compilan con
 * `tsconfig` separados (ver `apps/desktop/tsconfig.json` vs `tsconfig.node.json`); mantenerlos en
 * sync es responsabilidad de quien cambie cualquiera de los dos lados.
 */
export interface BackupResult {
  fileName: string;
  filePath: string;
  createdAt: string;
  sizeBytes: number;
}

export type BackupValidationStatus =
  | "valid"
  | "not_found"
  | "not_sqlite"
  | "corrupt"
  | "missing_tables"
  | "incompatible_older"
  | "incompatible_newer";

export interface BackupValidationResult {
  status: BackupValidationStatus;
  message: string;
  fileName: string;
  createdAt: string | null;
  migrationCount: number | null;
}

export type CreateBackupOutcome =
  | { cancelled: true }
  | { cancelled: false; result: BackupResult }
  | { cancelled: false; error: string };

export type SelectAndValidateOutcome =
  | { cancelled: true }
  | { cancelled: false; validation: BackupValidationResult }
  | { cancelled: false; error: string };

export type RestoreOutcome =
  | { success: true; preRestoreBackupFileName: string }
  | { success: false; error: string };

export interface BackupApi {
  create(): Promise<CreateBackupOutcome>;
  selectAndValidate(): Promise<SelectAndValidateOutcome>;
  restore(): Promise<RestoreOutcome>;
}

declare global {
  interface Window {
    stockNegozia: StockNegoziaApi;
    backup: BackupApi;
  }
}

export {};
