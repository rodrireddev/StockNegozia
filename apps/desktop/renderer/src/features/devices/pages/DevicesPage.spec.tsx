import type { DeviceDto } from "@stocknegozia/api-contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DevicesPage } from "./DevicesPage";

const { fetchDevicesMock, revokeDeviceMock, createPairingMock } = vi.hoisted(() => ({
  fetchDevicesMock: vi.fn(),
  revokeDeviceMock: vi.fn(),
  createPairingMock: vi.fn(),
}));

vi.mock("@/features/devices/api/devices.api", () => ({
  fetchDevices: fetchDevicesMock,
  revokeDevice: revokeDeviceMock,
  renameDevice: vi.fn(),
}));

vi.mock("@/features/devices/api/pairing.api", () => ({
  createPairing: createPairingMock,
  getPairingStatus: vi.fn(),
  cancelPairing: vi.fn(),
}));

const activeDevice: DeviceDto = {
  id: "device-1",
  name: "Notebook Administración",
  type: "desktop",
  active: true,
  isAdmin: true,
  createdAt: "2026-09-01T00:00:00.000Z",
  lastSeenAt: "2026-09-15T00:00:00.000Z",
};

const revokedDevice: DeviceDto = {
  id: "device-2",
  name: "Celular viejo",
  type: "mobile",
  active: false,
  isAdmin: false,
  createdAt: "2026-08-01T00:00:00.000Z",
  lastSeenAt: null,
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <DevicesPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  fetchDevicesMock.mockReset();
  revokeDeviceMock.mockReset();
  createPairingMock.mockReset();
  createPairingMock.mockReturnValue(new Promise(() => {})); // nunca resuelve por default
});

describe("DevicesPage", () => {
  it("muestra los dispositivos con su estado", async () => {
    fetchDevicesMock.mockResolvedValue([activeDevice, revokedDevice]);
    renderPage();

    expect(await screen.findByText("Notebook Administración")).toBeInTheDocument();
    expect(screen.getByText("Celular viejo")).toBeInTheDocument();
    expect(screen.getByText("Autorizado")).toBeInTheDocument();
    expect(screen.getByText("Revocado")).toBeInTheDocument();
  });

  it("muestra un mensaje cuando no hay dispositivos", async () => {
    fetchDevicesMock.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText(/todavía no hay dispositivos/i)).toBeInTheDocument();
  });

  it("solo los dispositivos activos muestran el botón Revocar", async () => {
    fetchDevicesMock.mockResolvedValue([activeDevice, revokedDevice]);
    renderPage();

    await screen.findByText("Notebook Administración");
    expect(screen.getAllByRole("button", { name: "Revocar" })).toHaveLength(1);
  });

  it("revocar pide confirmación y solo llama a la API al confirmar", async () => {
    fetchDevicesMock.mockResolvedValue([activeDevice]);
    revokeDeviceMock.mockResolvedValue({ ...activeDevice, active: false });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Revocar" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/revocar "notebook administración"/i)).toBeInTheDocument();
    expect(revokeDeviceMock).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Revocar" }));

    // La versión instalada de TanStack Query agrega un segundo argumento de contexto a
    // `mutationFn` — se verifica solo la variable que le pasamos nosotros.
    expect(revokeDeviceMock.mock.calls[0]?.[0]).toBe("device-1");
  });

  it("cancelar el diálogo de revocación no llama a la API", async () => {
    fetchDevicesMock.mockResolvedValue([activeDevice]);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Revocar" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    expect(revokeDeviceMock).not.toHaveBeenCalled();
  });
});
