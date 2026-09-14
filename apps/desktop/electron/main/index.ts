import { app, BrowserWindow, dialog, session } from "electron";
import { join } from "node:path";
import { BackendManager } from "./backend-manager";
import { ensureDeviceCredential } from "./bootstrap-device";
import { DeviceCredentialStore } from "./device-credential-store";
import { createMainWindow } from "./window";

const repoRoot = app.isPackaged ? process.resourcesPath : join(app.getAppPath(), "..", "..");
const dataDir = app.getPath("userData");

const backendManager = new BackendManager({
  repoRoot,
  dataDir,
  isPackaged: app.isPackaged,
});

const credentialStore = new DeviceCredentialStore(dataDir);

/**
 * Adjunta `Authorization: Bearer <credential>` a toda request de la sesión hacia el backend local,
 * a nivel de red — la credential nunca llega al proceso renderer/React (ni localStorage, ni
 * código de UI), así que `api-client.ts` no necesita saber que existe. No-op si todavía no hay
 * credential (desarrollo, o bootstrap pendiente).
 */
function attachDeviceCredential(credential: string): void {
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: [`${backendManager.baseUrl}/*`] },
    (details, callback) => {
      details.requestHeaders["Authorization"] = `Bearer ${credential}`;
      callback({ requestHeaders: details.requestHeaders });
    },
  );
}

// StockNegozia es una app de negocio (no gráficamente intensiva). Se deshabilita la
// aceleración por hardware para evitar caídas del proceso de GPU en máquinas virtuales,
// escritorios remotos o con drivers de video problemáticos — un compromiso habitual en
// apps Electron de tipo LOB.
app.disableHardwareAcceleration();
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-gpu-compositing");
app.commandLine.appendSwitch("disable-software-rasterizer");
app.commandLine.appendSwitch("disable-gpu-sandbox");
app.commandLine.appendSwitch("in-process-gpu");

let mainWindow: BrowserWindow | null = null;

async function bootstrap(): Promise<void> {
  if (mainWindow) return;

  backendManager.start();

  try {
    await backendManager.waitUntilHealthy();
  } catch (error) {
    dialog.showErrorBox(
      "StockNegozia",
      `No se pudo conectar con el backend: ${(error as Error).message}`,
    );
    app.quit();
    return;
  }

  try {
    const deviceCredential = await ensureDeviceCredential(
      backendManager.baseUrl,
      dataDir,
      credentialStore,
    );
    if (deviceCredential) attachDeviceCredential(deviceCredential.credential);
  } catch (error) {
    // En API_ACCESS_MODE=production sin credential, el backend rechazará las requests con 401 —
    // preferible a bloquear el arranque de la app por un problema transitorio de bootstrap.
    console.error(`[bootstrap-device] No se pudo resolver la credential del dispositivo: ${error}`);
  }

  mainWindow = createMainWindow();
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(bootstrap);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void bootstrap();
  }
});

app.on("before-quit", () => {
  backendManager.stop();
});
