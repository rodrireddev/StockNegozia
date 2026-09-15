import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { DeviceDto } from "@stocknegozia/api-contracts";
import { SettingsScreen } from "./SettingsScreen";

const mockSignOut = jest.fn();

jest.mock("@/devices/useDeviceInfo", () => ({
  useDeviceInfo: jest.fn(),
}));
jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ signOut: mockSignOut }),
}));

import { useDeviceInfo } from "@/devices/useDeviceInfo";

const mockedUseDeviceInfo = jest.mocked(useDeviceInfo);

async function renderWithClient(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const device: DeviceDto = {
  id: "device-1",
  name: "Mi teléfono",
  type: "mobile",
  active: true,
  isAdmin: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  lastSeenAt: null,
};

describe("SettingsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await cleanup();
  });

  it("muestra el estado del propio dispositivo, sin ninguna acción de administración", async () => {
    mockedUseDeviceInfo.mockReturnValue({
      isPending: false,
      isError: false,
      data: device,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useDeviceInfo>);

    await renderWithClient(<SettingsScreen />);

    expect(screen.getByText("Mi teléfono")).toBeTruthy();
    expect(screen.getByText("Autorizado")).toBeTruthy();
    // Nunca debe haber una acción de administración de OTROS dispositivos en esta pantalla.
    expect(screen.queryByText(/revocar/i)).toBeNull();
    expect(screen.queryByText(/emparejar otro/i)).toBeNull();
  });

  it("'Olvidar este dispositivo' dispara el logout local (no revocación en el backend)", async () => {
    mockedUseDeviceInfo.mockReturnValue({
      isPending: false,
      isError: false,
      data: device,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useDeviceInfo>);

    await renderWithClient(<SettingsScreen />);

    fireEvent.press(screen.getByText("Olvidar este dispositivo"));

    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
  });
});
