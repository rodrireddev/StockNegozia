import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  // 5544, no 5173 (el renderer de Electron) ni 3000/8080 (colisiones típicas) — ver
  // docs/lan/LAN_TESTING.md. `host: true` expone el dev server en todas las interfaces: para
  // probar M13 de verdad, el cliente también tiene que poder abrirse desde el segundo dispositivo,
  // no solo el backend.
  server: {
    port: 5544,
    host: true,
  },
  resolve: {
    alias: {
      // Mismo criterio que `apps/desktop/electron.vite.config.ts`: se resuelve al código fuente
      // (no a `dist/`) para que Rollup lo trate como ESM nativo en vez del CJS que emite su build.
      "@stocknegozia/api-contracts": resolve(
        __dirname,
        "../../packages/api-contracts/src/index.ts",
      ),
    },
  },
});
