import type { AccountMeDto } from "@stocknegozia/api-contracts";
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthRequiredError } from "@/lib/cloud-api-client";
import { AccountProvider, useAccount } from "./AccountContext";

const { getMeMock, loginMock, registerMock } = vi.hoisted(() => ({
  getMeMock: vi.fn(),
  loginMock: vi.fn(),
  registerMock: vi.fn(),
}));

vi.mock("./api/accounts.api", () => ({
  getMe: getMeMock,
  login: loginMock,
  register: registerMock,
}));

const me: AccountMeDto = {
  id: "user-1",
  email: "comercio@test.com",
  level: "bronze",
  currentStreak: 3,
  longestStreak: 5,
  referralCode: "ABC123",
  isCofounder: false,
  creditBalance: 42,
  emailVerifiedAt: null,
};

function Probe() {
  const { status, me: currentMe, login, signOut } = useAccount();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="balance">{currentMe?.creditBalance ?? "none"}</span>
      <button onClick={() => void login({ email: "a@a.com", password: "password1" })}>login</button>
      <button onClick={() => void signOut()}>logout</button>
    </div>
  );
}

function setCloudAccountBridge(token: string | null) {
  window.cloudAccount = {
    getToken: vi.fn().mockResolvedValue(token),
    setToken: vi.fn().mockResolvedValue(undefined),
    clearToken: vi.fn().mockResolvedValue(undefined),
  };
}

beforeEach(() => {
  getMeMock.mockReset();
  loginMock.mockReset();
  registerMock.mockReset();
});

describe("AccountContext (apps/desktop)", () => {
  it("sin token guardado, arranca unauthenticated sin llamar a getMe", async () => {
    setCloudAccountBridge(null);
    render(
      <AccountProvider>
        <Probe />
      </AccountProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated"));
    expect(getMeMock).not.toHaveBeenCalled();
  });

  it("con token guardado y getMe exitoso, arranca authenticated con el saldo", async () => {
    setCloudAccountBridge("jwt-existente");
    getMeMock.mockResolvedValue(me);

    render(
      <AccountProvider>
        <Probe />
      </AccountProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("authenticated"));
    expect(screen.getByTestId("balance")).toHaveTextContent("42");
  });

  it("con token guardado pero vencido (401 -> AuthRequiredError), cae a unauthenticated", async () => {
    setCloudAccountBridge("jwt-vencido");
    getMeMock.mockRejectedValue(new AuthRequiredError());

    render(
      <AccountProvider>
        <Probe />
      </AccountProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated"));
  });

  it("login exitoso guarda el token (vía window.cloudAccount.setToken) y pasa a authenticated", async () => {
    setCloudAccountBridge(null);
    loginMock.mockResolvedValue({ accessToken: "jwt-nuevo", expiresAt: "2030-01-01T00:00:00.000Z" });
    getMeMock.mockResolvedValue(me);

    render(
      <AccountProvider>
        <Probe />
      </AccountProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated"));

    await act(async () => {
      screen.getByText("login").click();
    });

    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("authenticated"));
    expect(window.cloudAccount.setToken).toHaveBeenCalledWith("jwt-nuevo", "2030-01-01T00:00:00.000Z");
  });

  it("signOut borra el token (vía window.cloudAccount.clearToken) y vuelve a unauthenticated", async () => {
    setCloudAccountBridge("jwt-existente");
    getMeMock.mockResolvedValue(me);

    render(
      <AccountProvider>
        <Probe />
      </AccountProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("authenticated"));

    await act(async () => {
      screen.getByText("logout").click();
    });

    expect(window.cloudAccount.clearToken).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated"));
    expect(screen.getByTestId("balance")).toHaveTextContent("none");
  });
});
