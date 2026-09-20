/** Espaciado en múltiplos de 4 — mismo ritmo que el `spacing` implícito de Tailwind en Desktop. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** `--radius: 0.5rem` (8px) en `index.css` del Desktop — mismo valor base, sin la unidad `rem`. */
export const radius = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  full: 999,
} as const;

export const typography = {
  title: { fontSize: 24, fontWeight: "700" as const, lineHeight: 30 },
  subtitle: { fontSize: 18, fontWeight: "600" as const, lineHeight: 24 },
  body: { fontSize: 15, fontWeight: "400" as const, lineHeight: 22 },
  bodyStrong: { fontSize: 15, fontWeight: "600" as const, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: "400" as const, lineHeight: 18 },
  label: { fontSize: 13, fontWeight: "600" as const, lineHeight: 18 },
};

/** Tamaño táctil mínimo recomendado (Material Design / Android Accessibility Scanner). */
export const minTouchTarget = 48;

/** Breakpoint tablet — ancho de pantalla en dp; ver `src/hooks/useDeviceSize.ts`. */
export const tabletBreakpoint = 768;

/**
 * Ancho máximo de una columna de contenido (ver `components/ScreenContainer.tsx`) — en tablet
 * (sobre todo en horizontal, donde el espacio disponible puede superar los 800dp) evita que texto
 * y controles de una sola columna se estiren de punta a punta de la pantalla, que es incómodo de
 * leer/usar. No tiene efecto en teléfono: el ancho de pantalla ahí siempre es menor a este valor.
 */
export const maxContentWidth = 640;
