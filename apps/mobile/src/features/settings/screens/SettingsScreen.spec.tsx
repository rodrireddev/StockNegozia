import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { DeviceDto } from "@stocknegozia/api-contracts";
import { ThemeProvider } from "@/theme/ThemeContext";
import { SettingsScreen } from "./SettingsScreen";

const mockSignOut = jest.fn();

jest.mock("@/devices/useDeviceInfo", () => ({
  useDeviceInfo: jest.fn(),
}));
jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ signOut: mockSignOut }),
}));
jest.mock("@/api/endpoints/settings", () => ({
  fetchSettings: jest.fn(),
  updateSettings: jest.fn(),
}));

import { useDeviceInfo } from "@/devices/useDeviceInfo";
import { fetchSettings, updateSettings } from "@/api/endpoints/settings";

const mockedUseDeviceInfo = jest.mocked(useDeviceInfo);
const mockedFetchSettings = jest.mocked(fetchSettings);
const mockedUpdateSettings = jest.mocked(updateSettings);

async function renderWithClient(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </ThemeProvider>,
  );
}

const device: DeviceDto = {
  id: "device-1",
  name: "Mi teléfono",
  type: "mobile",
  active: true,
  isAdmin: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  lastSeenAt: null,
  sellerName: null,
};

describe("SettingsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFetchSettings.mockResolvedValue({ businessName: null });
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

  it("muestra las tres opciones de tema, con Sistema seleccionado por defecto", async () => {
    mockedUseDeviceInfo.mockReturnValue({
      isPending: false,
      isError: false,
      data: device,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useDeviceInfo>);

    await renderWithClient(<SettingsScreen />);

    const system = await screen.findByRole("radio", { name: "Sistema" });
    const light = screen.getByRole("radio", { name: "Claro" });
    const dark = screen.getByRole("radio", { name: "Oscuro" });

    expect(system.props.accessibilityState.selected).toBe(true);
    expect(light.props.accessibilityState.selected).toBe(false);
    expect(dark.props.accessibilityState.selected).toBe(false);
  });

  it("elegir Oscuro selecciona esa opción y deselecciona las demás", async () => {
    mockedUseDeviceInfo.mockReturnValue({
      isPending: false,
      isError: false,
      data: device,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useDeviceInfo>);

    await renderWithClient(<SettingsScreen />);

    fireEvent.press(await screen.findByRole("radio", { name: "Oscuro" }));

    await waitFor(() =>
      expect(screen.getByRole("radio", { name: "Oscuro" }).props.accessibilityState.selected).toBe(
        true,
      ),
    );
    expect(screen.getByRole("radio", { name: "Sistema" }).props.accessibilityState.selected).toBe(
      false,
    );
    expect(screen.getByRole("radio", { name: "Claro" }).props.accessibilityState.selected).toBe(
      false,
    );
  });

  describe("nombre del negocio", () => {
    beforeEach(() => {
      mockedUseDeviceInfo.mockReturnValue({
        isPending: false,
        isError: false,
        data: device,
        refetch: jest.fn(),
      } as unknown as ReturnType<typeof useDeviceInfo>);
    });

    it("precarga el nombre del negocio ya guardado", async () => {
      mockedFetchSettings.mockResolvedValue({ businessName: "Almacén Doña Rosa" });

      await renderWithClient(<SettingsScreen />);

      expect(await screen.findByDisplayValue("Almacén Doña Rosa")).toBeTruthy();
    });

    it("guardar el nombre lo persiste y avisa", async () => {
      // Arranca con un nombre YA cargado (en vez de null) para tener una señal observable en el
      // DOM de que la query de `settings` resolvió y el efecto que precarga el input ya corrió —
      // esperar la promesa del mock a mano no alcanza, porque react-query todavía hace trabajo
      // async propio (notifyManager) después de que esa promesa resuelve, y tipear antes de que
      // eso termine hacía que el efecto pisara lo recién tipeado.
      mockedFetchSettings.mockResolvedValue({ businessName: "Nombre viejo" });
      mockedUpdateSettings.mockResolvedValue({ businessName: "Almacén Doña Rosa" });

      await renderWithClient(<SettingsScreen />);
      const input = await screen.findByDisplayValue("Nombre viejo");

      fireEvent.changeText(input, "Almacén Doña Rosa");
      // Confirma que el cambio ya se aplicó al input controlado antes de tocar "Guardar" — en este
      // entorno de test, presionar el botón inmediatamente después de `changeText` podía leer
      // todavía el valor viejo.
      await waitFor(() => expect(screen.getByDisplayValue("Almacén Doña Rosa")).toBeTruthy());
      fireEvent.press(screen.getByRole("button", { name: /^guardar$/i }));

      await waitFor(() =>
        expect(mockedUpdateSettings).toHaveBeenCalledWith({ businessName: "Almacén Doña Rosa" }),
      );
      expect(await screen.findByText(/nombre del negocio actualizado/i)).toBeTruthy();
    });
  });
});
