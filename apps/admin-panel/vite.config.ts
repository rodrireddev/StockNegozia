import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // 5560: no colisiona con el renderer de Electron (5173), el LAN test client (5544) ni los
  // backends (38123, 38200) — ver apps/web-client/vite.config.ts para el mismo criterio.
  server: {
    port: 5560,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      // Se resuelve al código fuente (no a `dist/`) para que Rollup lo trate como ESM nativo en
      // vez del CJS que emiten esos builds — mismo criterio que apps/web-client/vite.config.ts.
      "@stocknegozia/api-contracts": resolve(__dirname, "../../packages/api-contracts/src/index.ts"),
      "@stocknegozia/validation": resolve(__dirname, "../../packages/validation/src/index.ts"),
    },
  },
});
