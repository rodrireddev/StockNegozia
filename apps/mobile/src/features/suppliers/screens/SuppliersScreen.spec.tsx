import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { SupplierDto } from "@stocknegozia/api-contracts";
import { SuppliersScreen } from "./SuppliersScreen";

jest.mock("@/api/endpoints/suppliers", () => ({
  fetchSuppliers: jest.fn(),
  createSupplier: jest.fn(),
  updateSupplier: jest.fn(),
}));
jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ signOut: jest.fn() }),
}));

import { createSupplier, fetchSuppliers, updateSupplier } from "@/api/endpoints/suppliers";

const mockedFetchSuppliers = jest.mocked(fetchSuppliers);
const mockedCreateSupplier = jest.mocked(createSupplier);
const mockedUpdateSupplier = jest.mocked(updateSupplier);

const distribuidoraSur: SupplierDto = {
  id: 5,
  name: "Distribuidora Sur",
  phone: "+54 11 1234-5678",
  createdAt: "2026-01-01T00:00:00.000Z",
};

async function renderWithClient(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("SuppliersScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await cleanup();
  });

  it("lista los proveedores existentes, incluido su teléfono", async () => {
    mockedFetchSuppliers.mockResolvedValue([distribuidoraSur]);
    await renderWithClient(<SuppliersScreen />);

    expect(await screen.findByText("Distribuidora Sur")).toBeTruthy();
    expect(screen.getByText("+54 11 1234-5678")).toBeTruthy();
  });

  it("muestra un estado vacío cuando no hay proveedores", async () => {
    mockedFetchSuppliers.mockResolvedValue([]);
    await renderWithClient(<SuppliersScreen />);

    expect(await screen.findByText(/no tenés proveedores todavía/i)).toBeTruthy();
  });

  it("crea un proveedor con nombre y teléfono", async () => {
    mockedFetchSuppliers.mockResolvedValue([]);
    mockedCreateSupplier.mockResolvedValue({
      id: 9,
      name: "Nuevo Proveedor",
      phone: "011 4444-5555",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    await renderWithClient(<SuppliersScreen />);
    await screen.findByText(/no tenés proveedores todavía/i);

    await fireEvent.changeText(
      screen.getByPlaceholderText("Nombre del proveedor"),
      "Nuevo Proveedor",
    );
    await fireEvent.changeText(screen.getByPlaceholderText("Teléfono"), "011 4444-5555");
    await fireEvent.press(screen.getByText("Agregar"));

    await waitFor(() =>
      expect(mockedCreateSupplier).toHaveBeenCalledWith({
        name: "Nuevo Proveedor",
        phone: "011 4444-5555",
      }),
    );
  });

  it("editar un proveedor: precarga sus datos, guarda con PATCH y sale del modo edición", async () => {
    mockedFetchSuppliers.mockResolvedValue([distribuidoraSur]);
    mockedUpdateSupplier.mockResolvedValue({
      ...distribuidoraSur,
      name: "Distribuidora Sur SA",
      phone: "011 9999-0000",
    });
    await renderWithClient(<SuppliersScreen />);
    await screen.findByText("Distribuidora Sur");

    await fireEvent.press(screen.getByLabelText("Editar Distribuidora Sur"));

    const nameInput = await screen.findByDisplayValue("Distribuidora Sur");
    const phoneInput = await screen.findByDisplayValue("+54 11 1234-5678");
    await fireEvent.changeText(nameInput, "Distribuidora Sur SA");
    await fireEvent.changeText(phoneInput, "011 9999-0000");
    await fireEvent.press(screen.getByText("Guardar"));

    await waitFor(() =>
      expect(mockedUpdateSupplier).toHaveBeenCalledWith(distribuidoraSur.id, {
        name: "Distribuidora Sur SA",
        phone: "011 9999-0000",
      }),
    );
    await waitFor(() => expect(screen.queryByText("Guardar")).toBeNull());
  });

  it("cancelar la edición no llama a la API y descarta los cambios tipeados", async () => {
    mockedFetchSuppliers.mockResolvedValue([distribuidoraSur]);
    await renderWithClient(<SuppliersScreen />);
    await screen.findByText("Distribuidora Sur");

    await fireEvent.press(screen.getByLabelText("Editar Distribuidora Sur"));
    const nameInput = await screen.findByDisplayValue("Distribuidora Sur");
    await fireEvent.changeText(nameInput, "Borrador sin guardar");
    await fireEvent.press(screen.getByText("Cancelar"));

    expect(mockedUpdateSupplier).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText("Distribuidora Sur")).toBeTruthy());
  });
});
