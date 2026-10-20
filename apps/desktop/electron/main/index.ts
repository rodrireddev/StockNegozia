import { app, BrowserWindow, dialog, ipcMain, session } from "electron";
import { join } from "node:path";
import { startAutoUpdates } from "./auto-updater";
import { BackendExitedError, BackendManager } from "./backend-manager";
import { BackupManager } from "./backup-manager";
import { ensureDeviceCredential } from "./bootstrap-device";
import { CloudAccountCredentialStore } from "./cloud-account-credential-store";
import { DeviceCredentialStore } from "./device-credential-store";
import { PreferencesStore } from "./preferences-store";
import { ReceiptManager } from "./receipt-manager";
import { createSplashWindow } from "./splash";
import { ensureMinimumVisible, MIN_SPLASH_VISIBLE_MS } from "./splash-timing";
import { ThemeController } from "./theme-controller";
import { createMainWindow } from "./window";

const repoRoot = app.isPackaged ? process.resourcesPath : join(app.getAppPath(), "..", "..");
const dataDir = app.getPath("userData");
const iconPath = join(repoRoot, "assets", "branding", "generated", "windows", "icon.ico");

const backendManager = new BackendManager({
  repoRoot,
  dataDir,
  isPackaged: app.isPackaged,
});

const credentialStore = new DeviceCredentialStore(dataDir);
const cloudAccountCredentialStore = new CloudAccountCredentialStore(dataDir);
const preferencesStore = new PreferencesStore(dataDir);
const themeController = new ThemeController(preferencesStore);

/**
 * Empuja (o borra) la sesión de cuenta cloud al backend local (`PUT /cloud-account/session`, ver
 * docs/monetization/ADS_CREDITS_GAMIFICATION.md §6) — a diferencia de las requests que hace el
 * Renderer, esta la dispara Electron Main directamente, así que no pasa por el
 * `onBeforeSendHeaders` de `attachDeviceCredential` (eso solo intercepta requests de sesiones de
 * `webContents`): hay que adjuntar la credential del propio dispositivo a mano. Sin credential de
 * dispositivo todavía (bootstrap no resolvió), no hay nada que autenticar el push — se reintenta
 * solo, en el próximo login/logout o arranque.
 */
async function pushCloudSession(accessToken: string | null): Promise<void> {
  const deviceCredential = credentialStore.load()?.credential;
  if (!deviceCredential) return;

  try {
    await fetch(`${backendManager.baseUrl}/cloud-account/session`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${deviceCredential}` },
      body: JSON.stringify({ accessToken }),
    });
  } catch (error) {
    console.error(
      `[cloud-account] No se pudo sincronizar la sesión con el backend local: ${error}`,
    );
  }
}

ipcMain.handle(
  "cloudAccount:getToken",
  () => cloudAccountCredentialStore.load()?.accessToken ?? null,
);
ipcMain.handle("cloudAccount:setToken", async (_event, accessToken: string, expiresAt: string) => {
  cloudAccountCredentialStore.save({ accessToken, expiresAt });
  await pushCloudSession(accessToken);
});
ipcMain.handle("cloudAccount:clearToken", async () => {
  cloudAccountCredentialStore.clear();
  await pushCloudSession(null);
});

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

const backupManager = new BackupManager(backendManager, credentialStore, dataDir, () => mainWindow);
const receiptManager = new ReceiptManager(backendManager, credentialStore, () => mainWindow);

// Único punto de entrada de filesystem/backend para Backup/Restore desde el Renderer — ver
// docs/backup/BACKUP_RESTORE.md §Seguridad. El Renderer nunca recibe ni envía una ruta de
// archivo: solo dispara la acción y recibe el resultado ya resuelto por Electron Main.
ipcMain.handle("backup:create", () => backupManager.createBackup());
ipcMain.handle("backup:selectAndValidate", () => backupManager.selectAndValidateRestoreFile());
ipcMain.handle("backup:restore", () => backupManager.restoreSelectedFile());

// Mismo criterio que Backup: el recibo PDF lo genera siempre el backend, Electron Main sólo lo
// descarga y lo guarda donde el usuario elige en el diálogo nativo.
ipcMain.handle("receipt:downloadSale", (_event, saleId: number) =>
  receiptManager.downloadSaleReceipt(saleId),
);

themeController.registerIpcHandlers();

/**
 * Orden del arranque (ver docs/desktop/SPLASH.md para el diagrama completo):
 * 1. Resolver el tema guardado a un booleano explícito (`resolvedDark`) — antes de crear cualquier
 *    ventana, para que el splash nazca ya con el fondo correcto (sin flash blanco→oscuro ni splash
 *    con el tema equivocado).
 * 2. Mostrar el splash de inmediato (no depende del backend ni del renderer).
 * 3. Arrancar el backend y esperar su health check real — sin límite de tiempo: es un proceso
 *    hijo local, no una red externa, así que tarde lo que tarde siempre termina respondiendo (ver
 *    `BackendManager.waitUntilHealthy`). El splash cubre exactamente ese tiempo, sea cual sea — no
 *    hay ningún cartel de "no se pudo conectar" ni cierre automático de la app en este paso.
 * 4. Crear la ventana principal (oculta) y, recién cuando emite `ready-to-show`, esperar el piso
 *    de `MIN_SPLASH_VISIBLE_MS` desde que el splash se mostró (`ensureMinimumVisible`) y cerrar el
 *    splash + mostrarla en el mismo paso, para que no haya un frame intermedio sin ninguna ventana.
 */
async function bootstrap(): Promise<void> {
  if (mainWindow) return;

  const resolvedDark = themeController.applyStoredPreference();

  const splash = createSplashWindow({ repoRoot, iconPath, dark: resolvedDark });
  const splashShownAt = Date.now();

  backendManager.start();
  try {
    await backendManager.waitUntilHealthy();
  } catch (error) {
    if (!(error instanceof BackendExitedError)) throw error;
    // Típicamente: al actualizar la app, la migración de la base falló (drizzle hace ROLLBACK, así
    // que la base queda como estaba) — no tiene sentido dejar el splash colgado.
    splash.close();
    dialog.showErrorBox(
      "StockNegozia no pudo iniciar",
      "No se pudo abrir la base de datos. Tus datos no se modificaron.\n\n" +
        "Si acabás de actualizar la app, hay una copia de seguridad previa a la actualización en:\n" +
        join(dataDir, "backups", "pre-update"),
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

  // El proceso del backend es nuevo en cada arranque (`BackendManager.start()`), así que arranca
  // sin sesión de cuenta cloud en memoria aunque Desktop ya esté "logueado" localmente — hay que
  // reempujarla una vez que el backend está sano.
  const cloudAccountCredential = cloudAccountCredentialStore.load();
  if (cloudAccountCredential) void pushCloudSession(cloudAccountCredential.accessToken);

  mainWindow = createMainWindow(iconPath);
  mainWindow.once("ready-to-show", () => {
    void ensureMinimumVisible(splashShownAt, MIN_SPLASH_VISIBLE_MS).then(() => {
      splash.close();
      mainWindow?.show();
      startAutoUpdates();
    });
  });
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
