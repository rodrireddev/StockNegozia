import { apiGet, apiPost } from "./client";
import { AuthRequiredError, BackendNotConfiguredError, NetworkError } from "./errors";

jest.mock("@/config/backendUrlStore", () => ({
  getBackendUrl: jest.fn(),
}));
jest.mock("@/auth/SecureCredentialStore", () => ({
  secureCredentialStore: {
    getCredential: jest.fn(),
    setCredential: jest.fn(),
    clearCredential: jest.fn(),
  },
}));

import { getBackendUrl } from "@/config/backendUrlStore";
import { secureCredentialStore } from "@/auth/SecureCredentialStore";

const mockedGetBackendUrl = jest.mocked(getBackendUrl);
const mockedCredentialStore = jest.mocked(secureCredentialStore);

function mockFetchOnce(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  globalThis.fetch = jest.fn().mockResolvedValueOnce({
    ok: response.ok ?? true,
    status: response.status ?? 200,
    json: response.json ?? (async () => ({})),
  }) as unknown as typeof fetch;
}

describe("api client", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetBackendUrl.mockReturnValue("http://192.168.1.30:38123");
    mockedCredentialStore.getCredential.mockResolvedValue(null);
  });

  it("lanza BackendNotConfiguredError si no hay URL configurada", async () => {
    mockedGetBackendUrl.mockReturnValue(null);
    await expect(apiGet("/products")).rejects.toBeInstanceOf(BackendNotConfiguredError);
  });

  it("adjunta Authorization: Bearer <credential> cuando hay una guardada", async () => {
    mockedCredentialStore.getCredential.mockResolvedValue("sn_abc123");
    mockFetchOnce({ ok: true, status: 200, json: async () => [] });

    await apiGet("/products");

    const [, init] = (globalThis.fetch as jest.Mock).mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe("Bearer sn_abc123");
  });

  it("no envía Authorization cuando no hay credential guardada", async () => {
    mockFetchOnce({ ok: true, status: 200, json: async () => [] });

    await apiGet("/auth/devices/me").catch(() => {});

    const [, init] = (globalThis.fetch as jest.Mock).mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.has("Authorization")).toBe(false);
  });

  it("hace GET contra baseUrl + path y devuelve el JSON parseado", async () => {
    mockFetchOnce({ ok: true, status: 200, json: async () => [{ id: 1 }] });

    const result = await apiGet<{ id: number }[]>("/products");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://192.168.1.30:38123/products",
      expect.anything(),
    );
    expect(result).toEqual([{ id: 1 }]);
  });

  it("POST serializa el body como JSON y agrega Content-Type", async () => {
    mockFetchOnce({ ok: true, status: 201, json: async () => ({ ok: true }) });

    await apiPost("/auth/pairing/cancel", { pairingId: "abc" });

    const [, init] = (globalThis.fetch as jest.Mock).mock.calls[0];
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ pairingId: "abc" }));
    const headers = new Headers(init.headers);
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("ante un 401 limpia la credential guardada y lanza AuthRequiredError", async () => {
    mockedCredentialStore.getCredential.mockResolvedValue("sn_revoked");
    mockFetchOnce({ ok: false, status: 401 });

    await expect(apiGet("/auth/devices/me")).rejects.toBeInstanceOf(AuthRequiredError);
    expect(mockedCredentialStore.clearCredential).toHaveBeenCalledTimes(1);
  });

  it("ante un error HTTP no-401 propaga el mensaje del body si existe", async () => {
    mockFetchOnce({ ok: false, status: 400, json: async () => ({ message: "SKU duplicado" }) });

    await expect(apiGet("/products")).rejects.toThrow("SKU duplicado");
  });

  it("ante una falla de red (fetch rechaza) lanza NetworkError, no un 401", async () => {
    globalThis.fetch = jest
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch")) as unknown as typeof fetch;

    await expect(apiGet("/health")).rejects.toBeInstanceOf(NetworkError);
    expect(mockedCredentialStore.clearCredential).not.toHaveBeenCalled();
  });

  it("devuelve undefined en una respuesta 204", async () => {
    mockFetchOnce({ ok: true, status: 204 });
    await expect(apiPost("/auth/pairing/cancel", { pairingId: "abc" })).resolves.toBeUndefined();
  });
});
