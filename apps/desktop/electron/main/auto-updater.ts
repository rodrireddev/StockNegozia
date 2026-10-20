import { app, dialog } from "electron";
import { autoUpdater } from "electron-updater";

/**
 * Busca una versión nueva en GitHub Releases (`publish` en electron-builder.yml) una vez por
 * arranque, la baja en segundo plano y ofrece reiniciar. Si el usuario elige "Más tarde" se
 * instala sola al cerrar la app (`autoInstallOnAppQuit`, default de electron-updater). Instalar
 * es lo mismo que correr el instalador nuevo a mano: los datos viven fuera de la carpeta de
 * instalación y el backend respalda la base en `backups/pre-update/` antes de migrar.
 */
export function startAutoUpdates(): void {
  // Sin empaquetar no existe `app-update.yml`: electron-updater solo tiraría errores.
  if (!app.isPackaged) return;

  autoUpdater.on("update-downloaded", async (info) => {
    const { response } = await dialog.showMessageBox({
      type: "info",
      buttons: ["Reiniciar ahora", "Más tarde"],
      defaultId: 0,
      cancelId: 1,
      title: "Actualización lista",
      message: `StockNegozia ${info.version} está lista para instalarse.`,
      detail:
        'Si elegís "Más tarde", se instala sola cuando cierres la app. Tus datos no se tocan.',
    });
    if (response === 0) autoUpdater.quitAndInstall();
  });

  // Sin conexión, o GitHub caído: no es un error para el usuario, la app sigue funcionando igual.
  autoUpdater.on("error", (error) => console.error(`[auto-updater] ${error.message}`));
  autoUpdater.checkForUpdates().catch(() => {});
}
