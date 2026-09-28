import { LogBox } from "react-native";

type NativeAdsModule = typeof import("react-native-google-mobile-ads");

let cached: NativeAdsModule | null | undefined;

// React Native reporta la falla de `TurboModuleRegistry.getEnforcing` a LogBox por su cuenta (vía
// `ErrorUtils`/`addException`) apenas el `require()` de abajo tira la excepción — independiente de
// que este archivo la atrape con try/catch, así que sin esto igual aparece la pantalla roja "Uncaught
// Error" aunque el resto de la app siga funcionando bien. Es un error esperado y ya manejado en
// Expo Go (sin dev client), no algo que valga la pena mostrarle a quien está probando la app.
LogBox.ignoreLogs(["RNGoogleMobileAdsModule' could not be found"]);

/**
 * `react-native-google-mobile-ads` es un módulo nativo (código Java/Kotlin real) — no existe en
 * Expo Go, solo en un dev client/build nativo (mismo criterio que `apps/mobile-mini`, ver
 * docs/monetization/ADS_CREDITS_GAMIFICATION.md). Un `import` estático de este paquete en
 * cualquier archivo se evalúa siempre que ese archivo se carga, y como el propio paquete intenta
 * resolver el módulo nativo apenas se lo importa, eso crashea la app ENTERA al bootear en Expo Go.
 *
 * Todo lo que necesita este paquete pasa por `getNativeAdsModule()` en vez de importarlo directo:
 * `require()` (no `import`) recién se ejecuta cuando esta función se llama, y el try/catch
 * convierte el crash de arranque en un `null` manejable.
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
