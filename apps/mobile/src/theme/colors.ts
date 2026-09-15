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
};
