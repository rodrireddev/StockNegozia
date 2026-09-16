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
import { darkColors, lightColors, type ThemeColors } from "./colors";
import { getThemeMode, loadThemeMode, persistThemeMode, type ThemeMode } from "./themeStore";

export type { ThemeMode };

export interface ThemeContextValue {
  /** Preferencia elegida por la persona — "system" sigue el esquema del sistema operativo. */
  mode: ThemeMode;
  dark: boolean;
  colors: ThemeColors;
  /** `false` hasta que la preferencia persistida termina de cargar — ver `RootLayout`, que usa
   *  esto (junto a `AuthContext.status`) para no soltar el splash nativo antes de tiempo. */
  ready: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Único punto donde se resuelve el tema — Claro/Oscuro/Sistema (ver
 * docs/mobile/MOBILE_CLIENT.md y el plan de M15). Envuelve toda la app en `_layout.tsx`, antes de
 * `AuthProvider`, para que la preferencia esté disponible desde la primera pantalla.
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
    // y se persiste en paralelo — mismo criterio que `AuthContext.configureBackendUrl()`.
    setModeState(next);
    await persistThemeMode(next);
  }, []);

  const dark = mode === "system" ? systemScheme === "dark" : mode === "dark";

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, dark, colors: dark ? darkColors : lightColors, ready, setMode }),
    [mode, dark, ready, setMode],
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
