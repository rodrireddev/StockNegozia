import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { secureCredentialStore } from "@/auth/SecureCredentialStore";
import { getBackendUrl } from "@/config/backendUrlStore";
import { BackendNotConfiguredError } from "@/api/errors";

/**
 * El PDF del recibo siempre lo genera el backend (ver
 * apps/backend/src/core/sales/sale-receipt.pdf.ts) — acá sólo se descarga con la credential del
 * dispositivo y se abre la hoja nativa de compartir/guardar, que es el mecanismo estándar de
 * Expo para que la persona lo guarde en Archivos/Downloads sin pedir permisos extra de
 * almacenamiento.
 */
export async function downloadSaleReceipt(saleId: number): Promise<void> {
  const baseUrl = getBackendUrl();
  if (!baseUrl) throw new BackendNotConfiguredError();

  const credential = await secureCredentialStore.getCredential();
  const fileUri = `${FileSystem.cacheDirectory}recibo-venta-${saleId}.pdf`;

  const result = await FileSystem.downloadAsync(`${baseUrl}/sales/${saleId}/receipt`, fileUri, {
    headers: credential ? { Authorization: `Bearer ${credential}` } : {},
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`No se pudo descargar el recibo (status ${result.status})`);
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri, {
      mimeType: "application/pdf",
      dialogTitle: "Guardar o compartir recibo",
    });
  }
}
