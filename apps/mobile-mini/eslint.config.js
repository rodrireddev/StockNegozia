// @ts-check
const reactHooks = require("eslint-plugin-react-hooks");
const tseslint = require("typescript-eslint");
const base = require("@stocknegozia/config/eslint/base.js");

/**
 * Mismo criterio que `apps/mobile/eslint.config.js`: `base.js` (agnóstico de framework) +
 * `react-hooks` a mano, sin `react.js` (trae `eslint-plugin-react-refresh`, pensado para Vite).
 */
module.exports = tseslint.config(...base, {
  plugins: { "react-hooks": reactHooks },
  rules: {
    ...reactHooks.configs.recommended.rules,
  },
  ignores: ["expo-env.d.ts"],
});
