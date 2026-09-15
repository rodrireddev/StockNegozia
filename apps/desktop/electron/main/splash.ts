import { BrowserWindow } from "electron";
import { readFileSync } from "node:fs";
import path from "node:path";
import { resolveBackgroundHex, resolveForegroundHex } from "./theme-colors";

export interface SplashOptions {
  repoRoot: string;
  iconPath: string;
  /**
   * Ya resuelto por `ThemeController.applyStoredPreference()` (ver `index.ts`) — el splash no
   * consulta `nativeTheme` por su cuenta. Recibirlo explícito, en vez de volver a leerlo acá, es
   * justamente lo que garantiza que el fondo esté correcto desde el primer render.
   */
  dark: boolean;
}

function buildSplashHtml(logoDataUri: string, dark: boolean): string {
  const background = resolveBackgroundHex(dark);
  const foreground = resolveForegroundHex(dark);
  // Documento standalone, sin relación con `renderer/index.html`: no hereda su CSP ni depende del
  // bundle de Vite — así el splash puede pintarse antes de que exista cualquier build del
  // renderer. Los colores están inline (no hay Tailwind acá) pero replican los tokens reales de
  // `index.css` para que no haya un salto de color perceptible al pasar al Renderer real.
  //
  // El logo va embebido como base64 (`logoDataUri`), no como `<img src="file://...">`: un
  // documento `data:` tiene un origen opaco y Chromium bloquea silenciosamente que cargue
  // recursos `file://` (se ve como un ícono de imagen rota, sin ningún error en consola) — el
  // mismo documento sirviendo su propia imagen inline no tiene ese problema.
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      html, body {
        margin: 0;
        height: 100%;
        background: ${background};
        color: ${foreground};
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, "Segoe UI", Roboto, sans-serif;
        -webkit-user-select: none;
        user-select: none;
      }
      .splash {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
      }
      img {
        width: 96px;
        height: 96px;
      }
      .title {
        font-size: 15px;
        font-weight: 600;
        letter-spacing: 0.01em;
      }
    </style>
  </head>
  <body>
    <div class="splash">
      <img src="${logoDataUri}" alt="StockNegozia" />
      <div class="title">StockNegozia</div>
    </div>
  </body>
</html>`;
}

/**
 * Ventana de splash — independiente del lifecycle de `BackendManager`/`createMainWindow`, no lo
 * reemplaza ni lo duplica: `index.ts` la crea primero, y la cierra cuando el backend está
 * saludable y la ventana principal ya emitió `ready-to-show` (ver docs/desktop/SPLASH.md). Carga
 * un `data:` URL autocontenido — no pasa por Vite/electron-vite, así que no hace falta ningún
 * entrypoint de build nuevo ni assets copiados al output.
 *
 * Dos particularidades respecto del resto de las ventanas de la app (ambas explicadas en
 * docs/desktop/SPLASH.md):
 *
 * 1. `sandbox: false` — igual que la ventana principal (`window.ts`). Con el sandbox de Chromium
 *    activo (el default de Electron), la navegación al `data:` URL fallaba de forma consistente
 *    con `ERR_FAILED` en máquinas con GPU deshabilitada/virtualizada — no es un problema del
 *    contenido (un HTML mínimo sin JS fallaba igual), sino del sandbox del renderer en ese tipo de
 *    entorno. Sin JS de terceros ni contenido remoto acá, desactivarlo no abre ninguna superficie
 *    de ataque nueva.
 * 2. Se muestra de inmediato (`show: true`), sin esperar `ready-to-show` como hace
 *    `createMainWindow`. El `backgroundColor` nativo ya garantiza el color correcto desde el
 *    primer frame — no hace falta esperar a que el HTML/imagen terminen de pintar para eso.
 */
export function createSplashWindow({ repoRoot, iconPath, dark }: SplashOptions): BrowserWindow {
  const logoPath = path.join(
    repoRoot,
    "assets",
    "branding",
    "generated",
    "splash",
    "splash-logo.png",
  );
  const logoDataUri = `data:image/png;base64,${readFileSync(logoPath).toString("base64")}`;

  const window = new BrowserWindow({
    width: 320,
    height: 320,
    show: true,
    frame: false,
    resizable: false,
    movable: false,
    fullscreenable: false,
    maximizable: false,
    minimizable: false,
    skipTaskbar: false,
    backgroundColor: resolveBackgroundHex(dark),
    icon: iconPath,
    webPreferences: {
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  window
    .loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(buildSplashHtml(logoDataUri, dark))}`,
    )
    .catch(() => {
      // Si la carga del HTML falla igual (entorno todavía más restringido), la ventana ya está
      // visible con el `backgroundColor` correcto — no hay nada más que hacer acá.
    });

  return window;
}
