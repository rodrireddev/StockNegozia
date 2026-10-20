import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.spec.ts"],
    environment: "node",
    globals: false,
    setupFiles: ["src/test/vitest.setup.ts"],
    // Los e2e levantan la app Nest completa en beforeAll; con turbo corriendo todo en paralelo
    // (local o CI) el default de 10s no alcanza.
    hookTimeout: 30_000,
  },
});
