// @ts-check
const reactHooks = require("eslint-plugin-react-hooks");
const tseslint = require("typescript-eslint");
const base = require("@stocknegozia/config/eslint/base.js");

/**
 * No se reutiliza `@stocknegozia/config/eslint/react.js` — trae `eslint-plugin-react-refresh`,
 * pensado para Fast Refresh de Vite, no para Metro (ver docs/mobile/MOBILE_CLIENT.md §UI /
 * Design System sobre no forzar herramientas web en React Native). Sí se reutiliza `base.js`
 * (ESLint + typescript-eslint recomendados, agnóstico de framework) y se agrega `react-hooks` a
 * mano — mismas reglas que usa Desktop, sin la parte específica de Vite.
 */
module.exports = tseslint.config(...base, {
  plugins: { "react-hooks": reactHooks },
  rules: {
    ...reactHooks.configs.recommended.rules,
  },
  ignores: ["expo-env.d.ts"],
});
