import { app, BrowserWindow, dialog } from "electron";
import { join } from "node:path";
import { BackendManager } from "./backend-manager";
import { createMainWindow } from "./window";

const repoRoot = app.isPackaged ? process.resourcesPath : join(app.getAppPath(), "..", "..");

const backendManager = new BackendManager({
  repoRoot,
  dataDir: app.getPath("userData"),
  isPackaged: app.isPackaged,
});

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
