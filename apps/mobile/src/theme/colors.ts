/**
 * Tokens de color portados desde la paleta shadcn/slate del Desktop
 * (`apps/desktop/renderer/src/index.css`) — mismos valores HSL convertidos a hex, para mantener
 * una identidad visual coherente entre Desktop y Mobile. No se reutiliza Tailwind/shadcn/Radix en
 * sí (sin soporte real en React Native, ver docs/mobile/MOBILE_CLIENT.md §UI) — solo los tokens.
 */
export interface ThemeColors {
  background: string;
  foreground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  border: string;
  ring: string;
  danger: string;
  dangerForeground: string;
  success: string;
  warning: string;
  warningForeground: string;
}

export const lightColors: ThemeColors = {
  background: "#ffffff",
  foreground: "#0f172a",
  primary: "#0f172a",
  primaryForeground: "#f8fafc",
  secondary: "#f1f5f9",
  secondaryForeground: "#0f172a",
  muted: "#f1f5f9",
  mutedForeground: "#64748b",
  accent: "#f1f5f9",
  accentForeground: "#0f172a",
  border: "#e2e8f0",
  ring: "#0f172a",
  danger: "#dc2626",
  dangerForeground: "#fef2f2",
  success: "#16a34a",
  warning: "#d97706",
  warningForeground: "#fffbeb",
};

export const darkColors: ThemeColors = {
  background: "#0f172a",
  foreground: "#f8fafc",
  primary: "#f8fafc",
  primaryForeground: "#0f172a",
  secondary: "#1e293b",
  secondaryForeground: "#f8fafc",
  muted: "#1e293b",
  mutedForeground: "#94a3b8",
  accent: "#1e293b",
  accentForeground: "#f8fafc",
  border: "#1e293b",
  ring: "#cbd5e1",
  danger: "#f87171",
  dangerForeground: "#450a0a",
  success: "#4ade80",
  warning: "#fbbf24",
  warningForeground: "#451a03",
};

/**
 * Tres paletas alternativas seleccionables además de Claro/Oscuro — ver `theme/themes.ts` (el
 * registro que las expone como "tema" completo, no como una variante de `dark`) y
 * `docs/mobile/MOBILE_CLIENT.md`. Elegidas por ser combinaciones de color ya documentadas y
 * probadas específicamente para reducir la fatiga visual en sesiones largas frente a una
 * pantalla, no colores inventados al azar:
 *
 * - **Pastel**: paleta propia de tonos suaves y poco saturados (lavanda/menta/durazno) sobre un
 *   blanco cálido — sin blancos ni negros puros, que son los que más cansan la vista en uso
 *   prolongado.
 * - **Solarized**: la paleta de Ethan Schoonover (https://ethanschoonover.com/solarized/),
 *   diseñada calculando a mano la luminancia CIELAB de cada color específicamente para minimizar
 *   el contraste brillante entre texto y fondo. Se usa la variante "Light" (fondo crema, nunca
 *   blanco puro).
 * - **Nord**: la paleta ártica de https://www.nordtheme.com — tonos azul-grisáceos de bajo
 *   contraste, muy usada en editores/terminales por el mismo motivo (reducir fatiga visual en
 *   sesiones largas). Es oscura por diseño (`dark: true` en el registro).
 */
export const pastelColors: ThemeColors = {
  background: "#fbf7f4",
  foreground: "#4a4458",
  primary: "#b79ced",
  primaryForeground: "#2e2a3a",
  secondary: "#f3e8f8",
  secondaryForeground: "#4a4458",
  muted: "#f0eae4",
  mutedForeground: "#8a8296",
  accent: "#bfe3d0",
  accentForeground: "#264d3b",
  border: "#e7dfe9",
  ring: "#b79ced",
  danger: "#e38b95",
  dangerForeground: "#4a1420",
  success: "#8fcb9b",
  warning: "#e0ab5f",
  warningForeground: "#402c08",
};

/** Solarized Light — valores oficiales (`base3`/`base2`/`base01`/`blue`/`red`/`green`, ver
 *  https://ethanschoonover.com/solarized/#the-values). */
export const solarizedColors: ThemeColors = {
  background: "#fdf6e3",
  foreground: "#586e75",
  primary: "#268bd2",
  primaryForeground: "#fdf6e3",
  secondary: "#eee8d5",
  secondaryForeground: "#586e75",
  muted: "#eee8d5",
  mutedForeground: "#93a1a1",
  accent: "#eee8d5",
  accentForeground: "#586e75",
  border: "#dfd6bd",
  ring: "#268bd2",
  danger: "#dc322f",
  dangerForeground: "#fdf6e3",
  success: "#859900",
  warning: "#b58900",
  warningForeground: "#fdf6e3",
};

/** Nord — valores oficiales (`nord0`…`nord15`, ver
 *  https://www.nordtheme.com/docs/colors-and-palettes). */
export const nordColors: ThemeColors = {
  background: "#2e3440",
  foreground: "#eceff4",
  primary: "#88c0d0",
  primaryForeground: "#2e3440",
  secondary: "#3b4252",
  secondaryForeground: "#eceff4",
  muted: "#434c5e",
  mutedForeground: "#d8dee9",
  accent: "#4c566a",
  accentForeground: "#eceff4",
  border: "#4c566a",
  ring: "#88c0d0",
  danger: "#bf616a",
  dangerForeground: "#2e3440",
  success: "#a3be8c",
  warning: "#ebcb8b",
  warningForeground: "#2e3440",
};
