import { useColorScheme } from "react-native";
import { darkColors, lightColors, type ThemeColors } from "./colors";
import { useOptionalThemeContext } from "./ThemeContext";

export interface Theme {
  colors: ThemeColors;
  dark: boolean;
}

/**
 * Lee la preferencia Claro/Oscuro/Sistema resuelta por `ThemeProvider` (ver `ThemeContext.tsx`) —
 * que envuelve toda la app real en `_layout.tsx`, así que este es siempre el camino que toma la
 * app en uso. Si no hay `ThemeProvider` montado (un componente renderizado aislado en un test que
 * no necesita ejercitar el toggle de tema en sí), cae al comportamiento anterior a M15 — seguir
 * únicamente el esquema del sistema operativo — para no exigirle un Provider a los ~38 archivos
 * que ya consumían este hook antes de que existiera el toggle manual.
 */
export function useTheme(): Theme {
  const ctx = useOptionalThemeContext();
  const scheme = useColorScheme();
  if (ctx) return { colors: ctx.colors, dark: ctx.dark };
  const dark = scheme === "dark";
  return { colors: dark ? darkColors : lightColors, dark };
}
