import * as SecureStore from "expo-secure-store";
import { secureCredentialStore } from "./SecureCredentialStore";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const mockedSecureStore = jest.mocked(SecureStore);

describe("secureCredentialStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("guarda la credential bajo la key esperada", async () => {
    await secureCredentialStore.setCredential("sn_abc123");
    expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
      "stocknegozia.deviceCredential",
      "sn_abc123",
    );
  });

  it("recupera la credential guardada", async () => {
    mockedSecureStore.getItemAsync.mockResolvedValueOnce("sn_abc123");
    await expect(secureCredentialStore.getCredential()).resolves.toBe("sn_abc123");
  });

  it("devuelve null cuando no hay ninguna credential guardada", async () => {
    mockedSecureStore.getItemAsync.mockResolvedValueOnce(null);
    await expect(secureCredentialStore.getCredential()).resolves.toBeNull();
  });

  it("devuelve null si SecureStore falla al leer, en vez de propagar el error", async () => {
    mockedSecureStore.getItemAsync.mockRejectedValueOnce(new Error("keystore unavailable"));
    await expect(secureCredentialStore.getCredential()).resolves.toBeNull();
  });

  it("elimina la credential guardada", async () => {
    await secureCredentialStore.clearCredential();
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith("stocknegozia.deviceCredential");
  });

  it("no propaga el error si falla la eliminación (best-effort)", async () => {
    mockedSecureStore.deleteItemAsync.mockRejectedValueOnce(new Error("keystore unavailable"));
    await expect(secureCredentialStore.clearCredential()).resolves.toBeUndefined();
  });
});
