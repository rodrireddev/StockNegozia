import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@stocknegozia/api-contracts": resolve(
        __dirname,
        "../../packages/api-contracts/src/index.ts",
      ),
    },
  },
  test: {
    environment: "jsdom",
    globals: false,
    include: ["src/**/*.spec.ts"],
  },
});
