import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "renderer/src"),
      // Mismo criterio que electron.vite.config.ts: se resuelven al código fuente (no a dist/)
      // para que el analizador de módulos de Vite/Vitest los trate como ESM nativo.
      "@stocknegozia/validation": resolve(__dirname, "../../packages/validation/src/index.ts"),
      "@stocknegozia/api-contracts": resolve(
        __dirname,
        "../../packages/api-contracts/src/index.ts",
      ),
      "@stocknegozia/shared": resolve(__dirname, "../../packages/shared/src/index.ts"),
    },
  },
  test: {
    environment: "jsdom",
    globals: false,
    include: [
      "renderer/src/**/*.spec.{ts,tsx}",
      "electron/main/**/*.spec.ts",
      "scripts/**/*.spec.ts",
    ],
    setupFiles: ["renderer/src/test/setup.ts"],
  },
});
