// @ts-check
const tseslint = require("typescript-eslint");
const base = require("./base.js");

/** ESLint flat config for Node/NestJS packages. */
module.exports = tseslint.config(...base, {
  rules: {
    "@typescript-eslint/interface-name-prefix": "off",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
  },
});
