import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import type { ThemeColors } from "./colors";
import { getThemeMode, loadThemeMode, persistThemeMode, type ThemeMode } from "./themeStore";
import { THEMES } from "./themes";

export type { ThemeMode };

export interface ThemeContextValue {
  /** Preferencia elegida por la persona — "system" sigue el esquema del sistema operativo. */
  mode: ThemeMode;
  dark: boolean;
  colors: ThemeColors;
  /** `false` hasta que la preferencia persistida termina de cargar — ver `RootLayout`, que usa
   *  esto (junto al estado de las migraciones de la base local) para no soltar el splash nativo
   *  antes de tiempo. */
  ready: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Único punto donde se resuelve el tema — Sistema/Claro/Oscuro + las paletas alternativas de
 * `theme/themes.ts`. Envuelve toda la app en `_layout.tsx` para que la preferencia esté
 * disponible desde la primera pantalla.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>(() => getThemeMode() ?? "system");
  const [ready, setReady] = useState(() => getThemeMode() !== null);

  useEffect(() => {
    let cancelled = false;
    loadThemeMode().then((loaded) => {
      if (cancelled) return;
      setModeState(loaded);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setMode = useCallback(async (next: ThemeMode) => {
    // Se actualiza el estado en memoria de inmediato (la UI no espera al `await` de AsyncStorage)
    // y se persiste en paralelo.
    setModeState(next);
    await persistThemeMode(next);
  }, []);

  // "system" no es un tema en sí — resuelve a "light"/"dark" según el esquema del SO y de ahí en
  // más se trata igual que cualquier otro modo (ver THEMES en `theme/themes.ts`).
  const resolvedMode = mode === "system" ? (systemScheme === "dark" ? "dark" : "light") : mode;
  const theme = THEMES[resolvedMode];

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, dark: theme.dark, colors: theme.colors, ready, setMode }),
    [mode, theme, ready, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Acceso completo (incluye `setMode`) — pensado para la pantalla de Ajustes. Exige `ThemeProvider`. */
export function useThemeMode(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeMode debe usarse dentro de <ThemeProvider>");
  return ctx;
}

/** `null` fuera de `ThemeProvider` — usado por `useTheme()` para no exigirle un Provider a cada
 *  componente/test que solo necesita `{ colors, dark }` (ver `theme/useTheme.ts`). */
export function useOptionalThemeContext(): ThemeContextValue | null {
  return useContext(ThemeContext);
}
