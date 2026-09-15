import { afterEach, describe, expect, it } from "vitest";
import { resolveApiUrl } from "./config";

describe("resolveApiUrl", () => {
  const original = import.meta.env.VITE_API_URL;

  afterEach(() => {
    if (original === undefined) delete import.meta.env.VITE_API_URL;
    else import.meta.env.VITE_API_URL = original;
  });

  it("usa localhost:38123 por defecto si no hay VITE_API_URL", () => {
    delete import.meta.env.VITE_API_URL;
    expect(resolveApiUrl()).toBe("http://localhost:38123");
  });

  it("usa localhost:38123 si VITE_API_URL está vacío", () => {
    import.meta.env.VITE_API_URL = "   ";
    expect(resolveApiUrl()).toBe("http://localhost:38123");
  });

  it("usa la URL LAN configurada cuando VITE_API_URL está seteada", () => {
    import.meta.env.VITE_API_URL = "http://192.168.1.25:38123";
    expect(resolveApiUrl()).toBe("http://192.168.1.25:38123");
  });

  it("recorta espacios alrededor de la URL configurada", () => {
    import.meta.env.VITE_API_URL = "  http://192.168.1.25:38123  ";
    expect(resolveApiUrl()).toBe("http://192.168.1.25:38123");
  });
});
