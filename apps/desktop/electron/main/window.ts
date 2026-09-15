import { join } from "node:path";
import { BrowserWindow, shell } from "electron";

/**
 * A diferencia de versiones anteriores, esta ventana NO se muestra sola en `ready-to-show` — quien
 * la crea (`index.ts`) decide cuándo mostrarla, porque ese momento tiene que coordinarse con el
 * cierre del splash (ver `splash.ts` y docs/desktop/SPLASH.md). Mostrarla acá de forma
 * independiente reintroduciría la carrera que el splash existe para evitar.
 */
export function createMainWindow(iconPath?: string): BrowserWindow {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    icon: iconPath,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  if (process.env["ELECTRON_RENDERER_URL"]) {
    window.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    window.loadFile(join(__dirname, "../renderer/index.html"));
  }

  return window;
}
