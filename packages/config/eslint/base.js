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
);
