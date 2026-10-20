import { Text } from "react-native";
import { render, waitFor } from "@testing-library/react-native";
import { AuthProvider, useAuth } from "./AuthContext";
import { AuthRequiredError, NetworkError } from "@/api/errors";

jest.mock("@/config/backendUrlStore", () => ({
  loadBackendUrl: jest.fn().mockResolvedValue("http://192.168.1.30:38123"),
  getBackendUrl: jest.fn().mockReturnValue("http://192.168.1.30:38123"),
  setBackendUrl: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/auth/SecureCredentialStore", () => ({
  secureCredentialStore: {
    getCredential: jest.fn(),
    setCredential: jest.fn(),
    clearCredential: jest.fn(),
  },
}));
jest.mock("@/api/endpoints/auth", () => ({
  getMe: jest.fn(),
  confirmPairing: jest.fn(),
}));

import { secureCredentialStore } from "@/auth/SecureCredentialStore";
import { getMe } from "@/api/endpoints/auth";

const mockedCredentialStore = jest.mocked(secureCredentialStore);
const mockedGetMe = jest.mocked(getMe);

function StatusProbe() {
  const { status } = useAuth();
  return <Text>status:{status}</Text>;
}

describe("AuthProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("queda unauthenticated cuando no hay ninguna credential guardada", async () => {
    mockedCredentialStore.getCredential.mockResolvedValue(null);
    const { getByText } = await render(
      <AuthProvider>
        <StatusProbe />
      </AuthProvider>,
    );
    await waitFor(() => expect(getByText("status:unauthenticated")).toBeTruthy());
    expect(mockedGetMe).not.toHaveBeenCalled();
  });

  it("queda authenticated cuando hay una credential válida (getMe responde OK)", async () => {
    mockedCredentialStore.getCredential.mockResolvedValue("sn_valid");
    mockedGetMe.mockResolvedValue({
      id: "device-1",
      name: "Mi teléfono",
      type: "mobile",
      active: true,
      isAdmin: false,
      role: "manager",
      createdAt: "2026-01-01T00:00:00.000Z",
      lastSeenAt: null,
      sellerName: null,
    });

    const { getByText } = await render(
      <AuthProvider>
        <StatusProbe />
      </AuthProvider>,
    );
    await waitFor(() => expect(getByText("status:authenticated")).toBeTruthy());
  });

  it("vuelve a unauthenticated si la credential guardada ya fue revocada (401)", async () => {
    mockedCredentialStore.getCredential.mockResolvedValue("sn_revoked");
    mockedGetMe.mockRejectedValue(new AuthRequiredError());

    const { getByText } = await render(
      <AuthProvider>
        <StatusProbe />
      </AuthProvider>,
    );
    await waitFor(() => expect(getByText("status:unauthenticated")).toBeTruthy());
  });

  it("reintenta ante fallas de red transitorias y no se queda pegado en bootstrapping", async () => {
    mockedCredentialStore.getCredential.mockResolvedValue("sn_valid");
    mockedGetMe
      .mockRejectedValueOnce(new NetworkError())
      .mockRejectedValueOnce(new NetworkError())
      .mockResolvedValueOnce({
        id: "device-1",
        name: "Mi teléfono",
        type: "mobile",
        active: true,
        isAdmin: false,
        role: "manager",
        createdAt: "2026-01-01T00:00:00.000Z",
        lastSeenAt: null,
        sellerName: null,
      });

    const { getByText, queryByText } = await render(
      <AuthProvider>
        <StatusProbe />
      </AuthProvider>,
    );

    // Nunca debería mostrarse "unauthenticated" de paso mientras reintenta — un dispositivo con
    // credential guardada no debe verse expulsado a Pairing por una falla de red transitoria.
    await waitFor(() => expect(getByText("status:authenticated")).toBeTruthy(), { timeout: 4000 });
    expect(queryByText("status:unauthenticated")).toBeNull();
    expect(mockedGetMe).toHaveBeenCalledTimes(3);
  }, 10_000);

  it("si la red sigue fallando tras reintentar, cae a authenticated de forma optimista (no bloquea el uso offline)", async () => {
    mockedCredentialStore.getCredential.mockResolvedValue("sn_valid");
    mockedGetMe.mockRejectedValue(new NetworkError());

    const { getByText } = await render(
      <AuthProvider>
        <StatusProbe />
      </AuthProvider>,
    );

    await waitFor(() => expect(getByText("status:authenticated")).toBeTruthy(), { timeout: 4000 });
    expect(mockedGetMe).toHaveBeenCalledTimes(3);
  }, 10_000);
});
