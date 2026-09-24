type NativeAdsModule = typeof import("react-native-google-mobile-ads");

let cached: NativeAdsModule | null | undefined;

/**
 * `react-native-google-mobile-ads` es un módulo nativo (código Java/Kotlin real) — no existe en
 * Expo Go, solo en un dev client/build nativo (ver doc ADS_CREDITS_GAMIFICATION.md). Un `import`
 * estático de este paquete en cualquier archivo se evalúa siempre que ese archivo se carga, sin
 * importar si el código que lo usa realmente corre — y como el propio paquete intenta resolver el
 * módulo nativo apenas se lo importa, eso crashea la app ENTERA al bootear cuando corre en Expo
 * Go, no solo la pantalla de ads.
 *
 * Todo lo que necesita este paquete pasa por `getNativeAdsModule()` en vez de importarlo directo:
 * `require()` (no `import`) recién se ejecuta cuando esta función se llama, y el try/catch
 * convierte el crash de arranque en un `null` manejable — el resto de la app (productos, ventas,
 * cuenta, créditos) sigue funcionando igual en Expo Go; solo la parte de ads queda "no disponible".
 */
export function getNativeAdsModule(): NativeAdsModule | null {
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require("react-native-google-mobile-ads") as NativeAdsModule;
  } catch {
    cached = null;
  }
  return cached;
}
