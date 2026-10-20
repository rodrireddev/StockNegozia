const jestExpoPreset = require("jest-expo/jest-preset.js");

/**
 * Se parte del preset real (en vez de declarar `preset: "jest-expo"` y pisar sus claves a mano)
 * para poder extenderlo sin duplicar rutas absolutas que puedan cambiar entre versiones.
 *
 * Dos ajustes puntuales sobre el preset:
 * - `transform`: el preset solo corre babel-jest sobre `.js/.jsx/.ts/.tsx` — `lucide-react-native`
 *   resuelve a un build `.mjs` bajo la condición `"react-native"` de su `exports` map (correcto
 *   para Metro, que sí sabe procesar ESM; Jest no), así que sin este agregado Jest intenta
 *   ejecutar `export {...}` como CommonJS y falla.
 * - `transformIgnorePatterns`: mismo motivo — `lucide-react-native` vive dentro de
 *   `node_modules/.pnpm/...` y el patrón por defecto no lo incluye en la lista de paquetes que sí
 *   se transforman.
 */
/** @type {import('jest').Config} */
module.exports = {
  ...jestExpoPreset,
  moduleNameMapper: {
    ...jestExpoPreset.moduleNameMapper,
    "^@/(.*)$": "<rootDir>/src/$1",
    // El preset no mockea `@react-native-async-storage/async-storage` por su cuenta — sin esto,
    // cualquier test que ejercite un store respaldado por AsyncStorage (`themeStore.ts`,
    // `backendUrlStore.ts`) intenta llamar al módulo nativo real y falla. El mock in-memory que
    // el propio paquete distribuye alcanza — no hace falta uno artesanal.
    "^@react-native-async-storage/async-storage$":
      "@react-native-async-storage/async-storage/jest/async-storage-mock",
  },
  transform: {
    ...jestExpoPreset.transform,
    // Mismo transformer + preset que usa el preset para `.ts(x)/.js(x)` — sin esto, `babel-jest`
    // corre sin `babel-preset-expo` y no convierte `export {...}` de ESM a CommonJS.
    "\\.mjs$": jestExpoPreset.transform["\\.[jt]sx?$"],
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|lucide-react-native))",
    ...jestExpoPreset.transformIgnorePatterns.slice(1),
  ],
  // Con turbo corriendo todas las suites en paralelo (local o CI), el render inicial de una
  // pantalla puede pasar los 5s por defecto aunque el test esté bien.
  testTimeout: 20_000,
  testPathIgnorePatterns: ["/node_modules/", "/.expo/"],
};
