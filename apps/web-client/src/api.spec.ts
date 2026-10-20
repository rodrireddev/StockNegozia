import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthRequiredError, checkHealth, confirmPairing, getMe, loadProducts } from "./api";
import {
  clearStoredCredential,
  getStoredCredential,
  setStoredCredential,
} from "./credential-store";

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
    clearStoredCredential();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
    clearStoredCredential();
  });

  it("checkHealth pega a <API_URL>/health y devuelve el body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        status: "ok",
        uptimeSeconds: 1,
        database: { connected: true },
        timestamp: "now",
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await checkHealth();

    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://192.168.1.25:38123/health");
    expect(result.status).toBe("ok");
  });

  it("loadProducts pega a <API_URL>/products y devuelve la lista", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([{ id: 1, name: "Producto A" }]));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await loadProducts();

    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://192.168.1.25:38123/products");
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

  describe("credential y autenticación", () => {
    it("sin credential guardada, no envía Authorization", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
      global.fetch = fetchMock as unknown as typeof fetch;

      await loadProducts();

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(new Headers(init.headers).has("authorization")).toBe(false);
    });

    it("con credential guardada, envía Authorization: Bearer <credential>", async () => {
      setStoredCredential("sn_mi-credential");
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
      global.fetch = fetchMock as unknown as typeof fetch;

      await loadProducts();

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(new Headers(init.headers).get("authorization")).toBe("Bearer sn_mi-credential");
    });

    it("un 401 limpia la credential guardada y lanza AuthRequiredError", async () => {
      setStoredCredential("sn_credential-revocada");
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: "Unauthorized" }, 401));
      global.fetch = fetchMock as unknown as typeof fetch;

      await expect(loadProducts()).rejects.toBeInstanceOf(AuthRequiredError);
      expect(getStoredCredential()).toBeNull();
    });

    it("getMe pega a /auth/devices/me con la credential guardada", async () => {
      setStoredCredential("sn_mi-credential");
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          id: "device-1",
          name: "Notebook",
          type: "web",
          active: true,
          isAdmin: false,
          createdAt: "2026-09-15T00:00:00.000Z",
          lastSeenAt: null,
        }),
      );
      global.fetch = fetchMock as unknown as typeof fetch;

      const me = await getMe();

      expect(fetchMock).toHaveBeenCalledWith(
        "http://192.168.1.25:38123/auth/devices/me",
        expect.anything(),
      );
      expect(me.name).toBe("Notebook");
    });
  });

  describe("confirmPairing", () => {
    it("en éxito, devuelve el device y la credential", async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          device: { id: "device-1", name: "Web", type: "web" },
          credential: "sn_nueva",
        }),
      );
      global.fetch = fetchMock as unknown as typeof fetch;

      const result = await confirmPairing({
        pairingId: "pairing-1",
        token: "sn_token",
        verificationCode: "123456",
      });

      expect(result.credential).toBe("sn_nueva");
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://192.168.1.25:38123/auth/pairing/confirm");
      expect(JSON.parse(init.body as string)).toMatchObject({
        pairingId: "pairing-1",
        token: "sn_token",
        verificationCode: "123456",
        deviceType: "web",
      });
    });

    it("un código o token incorrecto (401) da un mensaje de pairing, no de dispositivo revocado", async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: "Unauthorized" }, 401));
      global.fetch = fetchMock as unknown as typeof fetch;

      await expect(
        confirmPairing({ pairingId: "pairing-1", token: "sn_token", verificationCode: "000000" }),
      ).rejects.toThrow(/código o datos incorrectos/i);
    });
  });
});
