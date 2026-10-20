import { create } from "zustand";
import type { ThemePreference } from "@/types/global";

interface ThemeState {
  preference: ThemePreference;
  resolvedDark: boolean;
}

/**
 * `nativeTheme` en Electron Main es la única fuente de verdad para "claro/oscuro" (ver
 * docs/desktop/THEME.md) — este store solo refleja lo que Main ya resolvió. No hay `matchMedia`
 * acá: el caso "Sistema" ya viene resuelto en `resolvedDark` porque Main lo calculó con
 * `nativeTheme.shouldUseDarkColors`. La paleta concreta a aplicar (`pastel`/`solarized`/`nord`,
 * más allá de claro/oscuro) sí se resuelve acá, porque Main no la conoce — sólo sabe de
 * `"system"|"light"|"dark"` a nivel nativo (ver `nativeThemeSourceFor` en
 * `electron/main/theme-colors.ts`).
 */
export const useThemeStore = create<ThemeState>(() => ({
  preference: "system",
  resolvedDark: false,
}));

const CSS_PALETTES = ["pastel", "solarized", "nord"] as const;

function applyResolvedTheme(preference: ThemePreference, resolvedDark: boolean): void {
  document.documentElement.classList.toggle("dark", resolvedDark);

  const resolvedPreference =
    preference === "system" ? (resolvedDark ? "dark" : "light") : preference;
  if ((CSS_PALETTES as readonly string[]).includes(resolvedPreference)) {
    document.documentElement.setAttribute("data-theme", resolvedPreference);
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

let unsubscribeFromUpdates: (() => void) | null = null;

/**
 * Se llama una única vez al arrancar el Renderer (ver `main.tsx`). La ventana principal solo se
 * muestra después de `ready-to-show` (ver `window.ts`/`index.ts`), así que este roundtrip de IPC
 * ya resolvió mucho antes de que el usuario vea la ventana — no hace falta bloquear el render en
 * este `await` para evitar un flash de tema claro.
 */
export async function initializeTheme(): Promise<void> {
  const status = await window.theme.get();
  useThemeStore.setState(status);
  applyResolvedTheme(status.preference, status.resolvedDark);

  unsubscribeFromUpdates?.();
  unsubscribeFromUpdates = window.theme.onUpdated((resolvedDark) => {
    useThemeStore.setState({ resolvedDark });
    applyResolvedTheme(useThemeStore.getState().preference, resolvedDark);
  });
}

export async function setThemePreference(preference: ThemePreference): Promise<void> {
  const status = await window.theme.set(preference);
  useThemeStore.setState(status);
  applyResolvedTheme(status.preference, status.resolvedDark);
}
