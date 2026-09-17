import { app, BrowserWindow, dialog } from "electron";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { BackendManager } from "./backend-manager";
import type { DeviceCredentialStore } from "./device-credential-store";

export type DownloadReceiptOutcome =
  | { cancelled: true }
  | { cancelled: false; filePath: string }
  | { cancelled: false; error: string };

/**
 * Descarga el recibo PDF de una venta — el PDF siempre se genera en el backend (ver
 * apps/backend/src/core/sales/sale-receipt.pdf.ts), Electron Main sólo lo pide por HTTP con la
 * credential del dispositivo y lo escribe en la ruta que el usuario elige en el diálogo nativo.
 * Mismo criterio que BackupManager: el Renderer nunca ve una ruta de archivo real.
 */
export class ReceiptManager {
  constructor(
    private readonly backendManager: BackendManager,
    private readonly credentialStore: DeviceCredentialStore,
    private readonly getMainWindow: () => BrowserWindow | null,
  ) {}

  private authHeaders(): Record<string, string> {
    const stored = this.credentialStore.load();
    return stored ? { Authorization: `Bearer ${stored.credential}` } : {};
  }

  async downloadSaleReceipt(saleId: number): Promise<DownloadReceiptOutcome> {
    const window = this.getMainWindow();
    const defaultFileName = `recibo-venta-${saleId}.pdf`;
    const dialogResult = await dialog.showSaveDialog(window ?? (undefined as unknown as BrowserWindow), {
      title: "Guardar recibo de venta",
      defaultPath: path.join(app.getPath("documents"), defaultFileName),
      filters: [{ name: "Recibo PDF", extensions: ["pdf"] }],
    });

    if (dialogResult.canceled || !dialogResult.filePath) {
      return { cancelled: true };
    }

    try {
      const response = await fetch(`${this.backendManager.baseUrl}/sales/${saleId}/receipt`, {
        headers: this.authHeaders(),
      });
      if (!response.ok) {
        throw new Error(`No se pudo descargar el recibo (status ${response.status})`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(dialogResult.filePath, buffer);
      return { cancelled: false, filePath: dialogResult.filePath };
    } catch (error) {
      return {
        cancelled: false,
        error: error instanceof Error ? error.message : "No se pudo descargar el recibo.",
      };
    }
  }
}
