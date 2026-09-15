import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkHealth, loadProducts } from "./api";

const originalFetch = global.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("api", () => {
  beforeEach(() => {
    import.meta.env.VITE_API_URL = "http://192.168.1.25:38123";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("checkHealth pega a <API_URL>/health y devuelve el body", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({
          status: "ok",
          uptimeSeconds: 1,
          database: { connected: true },
          timestamp: "now",
        }),
      );
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await checkHealth();

    expect(fetchMock).toHaveBeenCalledWith("http://192.168.1.25:38123/health");
    expect(result.status).toBe("ok");
  });

  it("loadProducts pega a <API_URL>/products y devuelve la lista", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([{ id: 1, name: "Producto A" }]));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await loadProducts();

    expect(fetchMock).toHaveBeenCalledWith("http://192.168.1.25:38123/products");
    expect(result).toEqual([{ id: 1, name: "Producto A" }]);
  });

  it("un status de error con body JSON {message} propaga ese mensaje", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ message: "Producto no encontrado" }, 404));
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(loadProducts()).rejects.toThrow("Producto no encontrado");
  });

  it("un status de error sin body JSON usable devuelve un mensaje genérico con el status", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("not json", { status: 500 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(checkHealth()).rejects.toThrow("Request to /health failed with status 500");
  });

  it("una falla de red (backend inalcanzable) propaga el error de fetch sin envolverlo", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(checkHealth()).rejects.toThrow("Failed to fetch");
  });
});
