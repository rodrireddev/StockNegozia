import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// `globals: false` en vitest.config.ts (mismo criterio que el backend, ver
// apps/backend/src/test/vitest.setup.ts) — Testing Library no registra la limpieza automática
// del DOM entre tests sin un runner con globals de Jest, así que se hace explícita acá.
afterEach(() => {
  cleanup();
});
