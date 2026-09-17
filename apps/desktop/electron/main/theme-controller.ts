import { BrowserWindow, ipcMain, nativeTheme } from "electron";
import type { PreferencesStore, ThemePreference } from "./preferences-store";
import { nativeThemeSourceFor, resolveDark } from "./theme-colors";

export interface ThemeStatus {
  preference: ThemePreference;
  resolvedDark: boolean;
}

/**
 * Fuente de verdad del tema: `nativeTheme.themeSource` (API nativa de Electron, sin dependencias
 * nuevas). Al ponerlo en `"system"`, Electron resuelve `shouldUseDarkColors` según el SO y emite
 * `"updated"` cuando el SO cambia de tema mientras la app está abierta — no hace falta escuchar
 * `matchMedia` por separado en el Renderer ni duplicar esa lógica ahí.
 *
 * `applyStoredPreference()` se llama antes de crear cualquier ventana (ver `index.ts`) y devuelve
 * el booleano ya resuelto (no solo lo aplica) para que el splash lo reciba explícito, sin tener
 * que releer `nativeTheme` por su cuenta un instante después — para `"light"`/`"dark"` la
 * respuesta ya está en la preferencia misma, así que `resolveDark` ni siquiera consulta
 * `nativeTheme` en esos casos (ver `theme-colors.ts`). Esto es lo que evita el "splash blanco →
 * flash → app oscura" / "splash con el tema equivocado" en el arranque en frío.
 */
export class ThemeController {
  constructor(private readonly store: PreferencesStore) {}

  applyStoredPreference(): boolean {
    const preference = this.store.load().theme;
    nativeTheme.themeSource = nativeThemeSourceFor(preference);
    return resolveDark(preference, nativeTheme.shouldUseDarkColors);
  }

  private status(): ThemeStatus {
    const preference = this.store.load().theme;
    return { preference, resolvedDark: resolveDark(preference, nativeTheme.shouldUseDarkColors) };
  }

  registerIpcHandlers(): void {
    ipcMain.handle("theme:get", () => this.status());

    ipcMain.handle("theme:set", (_event, preference: ThemePreference) => {
      this.store.save({ theme: preference });
      nativeTheme.themeSource = nativeThemeSourceFor(preference);
      return this.status();
    });

    nativeTheme.on("updated", () => {
      const resolvedDark = nativeTheme.shouldUseDarkColors;
      for (const window of BrowserWindow.getAllWindows()) {
        window.webContents.send("theme:updated", resolvedDark);
      }
    });
  }
}
