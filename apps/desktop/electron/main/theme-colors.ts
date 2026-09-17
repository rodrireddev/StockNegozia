import type { ThemePreference } from "./preferences-store";

/**
 * Qué paletas son "oscuras" — mismo flag `dark` que cada tema define en
 * `apps/mobile/src/theme/themes.ts` (light/pastel/solarized son claras; dark/nord son oscuras).
 */
const PALETTE_IS_DARK: Record<Exclude<ThemePreference, "system">, boolean> = {
  light: false,
  dark: true,
  pastel: false,
  solarized: false,
  nord: true,
};

/**
 * Resuelve el booleano "oscuro sí/no" a partir de la preferencia guardada, SIN pasar por
 * `nativeTheme` para los casos explícitos (`"light"`/`"dark"`/paletas alternativas) — ahí no hay
 * nada que "resolver", la respuesta ya está en la preferencia misma. Solo `"system"` necesita el
 * valor real del SO (`systemPrefersDark`, provisto por el llamador vía
 * `nativeTheme.shouldUseDarkColors`).
 *
 * Existe porque depender de `nativeTheme.shouldUseDarkColors` incluso para preferencias explícitas
 * dejaba una ventana (particularmente notoria en el arranque en frío, antes de que el message pump
 * de Electron esté completamente asentado) donde ese getter podía no reflejar todavía el
 * `themeSource` recién asignado — el splash terminaba naciendo con el tema equivocado. Ver
 * docs/desktop/SPLASH.md.
 */
export function resolveDark(preference: ThemePreference, systemPrefersDark: boolean): boolean {
  if (preference === "system") return systemPrefersDark;
  return PALETTE_IS_DARK[preference];
}

/**
 * `nativeTheme.themeSource` (API nativa de Electron) sólo acepta `"system"|"light"|"dark"` — las
 * paletas alternativas no existen para el SO, así que se fuerza la que más se le parece (clara u
 * oscura) para que la ventana/diálogos nativos no queden desalineados del resto de la UI.
 */
export function nativeThemeSourceFor(preference: ThemePreference): "system" | "light" | "dark" {
  if (preference === "system") return "system";
  return PALETTE_IS_DARK[preference] ? "dark" : "light";
}

/**
 * Colores planos usados por Electron Main (ventana del splash: `backgroundColor` nativo y el HTML
 * inline que carga) antes de que exista cualquier CSS de Tailwind. Deben coincidir con los tokens
 * `--background` de `renderer/src/index.css` (light: `0 0% 100%`, dark: `222.2 84% 4.9%`) — si esos
 * tokens cambian, actualizar estos hex a mano (son solo 2 valores, no vale la pena una pipeline de
 * conversión HSL→hex para esto).
 */
export const LIGHT_BACKGROUND_HEX = "#ffffff";
export const DARK_BACKGROUND_HEX = "#020817";

export const LIGHT_FOREGROUND_HEX = "#0f172a";
export const DARK_FOREGROUND_HEX = "#f8fafc";

export function resolveBackgroundHex(dark: boolean): string {
  return dark ? DARK_BACKGROUND_HEX : LIGHT_BACKGROUND_HEX;
}

export function resolveForegroundHex(dark: boolean): string {
  return dark ? DARK_FOREGROUND_HEX : LIGHT_FOREGROUND_HEX;
}
