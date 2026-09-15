// @ts-check
const tseslint = require("typescript-eslint");
const eslint = require("@eslint/js");

/** Base ESLint flat config shared by every package/app in the monorepo. */
module.exports = tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    ignores: [
      "**/dist/**",
      "**/build/**",
      "**/out/**",
      "**/node_modules/**",
      "**/*.config.js",
      "**/*.config.ts",
    ],
  },
  {
    // Scripts de Node ejecutados directamente (no TypeScript, no bundle) — a diferencia de los
    // `.ts` del resto del monorepo, estos no pasan por el parser de typescript-eslint, así que
    // ESLint no conoce los globals de Node por sí solo.
    files: ["**/scripts/**/*.{mjs,cjs,js}"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
      },
    },
  },
);
