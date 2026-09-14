import react from "@vitejs/plugin-react";
import { externalizeDepsPlugin, defineConfig } from "electron-vite";
import { resolve } from "node:path";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: resolve(__dirname, "electron/main/index.ts"),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: resolve(__dirname, "electron/preload/index.ts"),
      },
    },
  },
  renderer: {
    root: resolve(__dirname, "renderer"),
    resolve: {
      alias: {
        "@": resolve(__dirname, "renderer/src"),
        // Se resuelven al código fuente (no a dist/) para que Rollup los trate como ESM nativo:
        // los paquetes compartidos se compilan a CommonJS para que el backend (Node) los pueda
        // usar con `require`, pero esa salida CJS confunde el análisis estático de Rollup cuando
        // el renderer importa valores en tiempo de ejecución (no solo tipos) desde ellos.
        "@stocknegozia/validation": resolve(__dirname, "../../packages/validation/src/index.ts"),
        "@stocknegozia/api-contracts": resolve(
          __dirname,
          "../../packages/api-contracts/src/index.ts",
        ),
        "@stocknegozia/shared": resolve(__dirname, "../../packages/shared/src/index.ts"),
      },
    },
    plugins: [react()],
    build: {
      rollupOptions: {
        input: resolve(__dirname, "renderer/index.html"),
      },
    },
  },
});
