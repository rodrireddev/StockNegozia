import {
  darkColors,
  lightColors,
  nordColors,
  pastelColors,
  solarizedColors,
  type ThemeColors,
} from "./colors";
import type { ThemeMode } from "./themeStore";

export interface ThemeDefinition {
  label: string;
  colors: ThemeColors;
  /** Determina el `StatusBar`/ícono de sistema — no es "es oscuro visualmente", es "su fondo es
   *  lo bastante oscuro como para necesitar iconografía clara" (ver `ThemeContext.tsx`). */
  dark: boolean;
}

/**
 * Registro único de temas seleccionables — cada uno es una paleta completa e independiente, no
 * una variante de `dark`. "system" no está acá: no es un tema en sí, resuelve a "light"/"dark"
 * según el esquema del sistema operativo (ver `ThemeContext.tsx`). Agregar un tema nuevo es
 * agregar una entrada acá + su `ThemeColors` en `colors.ts` — no requiere tocar `ThemeContext`.
 */
export const THEMES: Record<Exclude<ThemeMode, "system">, ThemeDefinition> = {
  light: { label: "Claro", colors: lightColors, dark: false },
  dark: { label: "Oscuro", colors: darkColors, dark: true },
  pastel: { label: "Pastel", colors: pastelColors, dark: false },
  solarized: { label: "Solarized", colors: solarizedColors, dark: false },
  nord: { label: "Nord", colors: nordColors, dark: true },
};
