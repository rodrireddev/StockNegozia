const jestExpoPreset = require("jest-expo/jest-preset.js");

/**
 * Mismo preset y mismos dos ajustes puntuales que `apps/mobile/jest.config.js` (lucide-react-native
 * resuelve a un build `.mjs` que Jest no transforma por defecto) — ver ese archivo para el detalle.
 */
/** @type {import('jest').Config} */
module.exports = {
  ...jestExpoPreset,
  moduleNameMapper: {
    ...jestExpoPreset.moduleNameMapper,
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@react-native-async-storage/async-storage$":
      "@react-native-async-storage/async-storage/jest/async-storage-mock",
  },
  transform: {
    ...jestExpoPreset.transform,
    "\\.mjs$": jestExpoPreset.transform["\\.[jt]sx?$"],
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|lucide-react-native))",
    ...jestExpoPreset.transformIgnorePatterns.slice(1),
  ],
  testPathIgnorePatterns: ["/node_modules/", "/.expo/"],
};
