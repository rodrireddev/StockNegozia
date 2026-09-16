import type { SupplierDto } from "@stocknegozia/api-contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SuppliersPage } from "./SuppliersPage";

const { fetchSuppliersMock, createSupplierMock, updateSupplierMock } = vi.hoisted(() => ({
  fetchSuppliersMock: vi.fn(),
  createSupplierMock: vi.fn(),
  updateSupplierMock: vi.fn(),
}));

vi.mock("@/features/suppliers/api/suppliers.api", () => ({
  fetchSuppliers: fetchSuppliersMock,
  createSupplier: createSupplierMock,
  updateSupplier: updateSupplierMock,
}));

const distribuidoraSur: SupplierDto = {
  id: 1,
  name: "Distribuidora Sur",
  phone: "+54 11 1234-5678",
  createdAt: "2026-01-01T00:00:00.000Z",
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SuppliersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  fetchSuppliersMock.mockReset();
  createSupplierMock.mockReset();
  updateSupplierMock.mockReset();
});

describe("SuppliersPage", () => {
  it("muestra un estado de carga mientras se listan los proveedores", () => {
    fetchSuppliersMock.mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByText(/cargando proveedores/i)).toBeInTheDocument();
  });

  it("muestra un mensaje amigable si falla la carga", async () => {
    fetchSuppliersMock.mockRejectedValue(new TypeError("Failed to fetch"));
    renderPage();

    const message = await screen.findByText(/no se pudo cargar los proveedores/i);
    expect(message.textContent).not.toMatch(/failed to fetch/i);
    expect(screen.getByRole("button", { name: /reintentar/i })).toBeInTheDocument();
  });

  it("muestra un estado vacío cuando no hay proveedores", async () => {
    fetchSuppliersMock.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText(/no tenés proveedores todavía/i)).toBeInTheDocument();
  });

  it("lista los proveedores existentes, incluido su teléfono", async () => {
    fetchSuppliersMock.mockResolvedValue([distribuidoraSur]);
    renderPage();

    expect(await screen.findByText("Distribuidora Sur")).toBeInTheDocument();
    expect(screen.getByText("+54 11 1234-5678")).toBeInTheDocument();
  });

  it("valida que el nombre sea obligatorio antes de enviar la request", async () => {
    fetchSuppliersMock.mockResolvedValue([]);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/no tenés proveedores todavía/i);

    await user.click(screen.getByRole("button", { name: /agregar/i }));

    expect(await screen.findByText(/el nombre es obligatorio/i)).toBeInTheDocument();
    expect(createSupplierMock).not.toHaveBeenCalled();
  });

  it("crea un proveedor con el nombre ingresado y limpia el input al confirmar", async () => {
    fetchSuppliersMock.mockResolvedValue([]);
    createSupplierMock.mockResolvedValue({
      id: 2,
      name: "Nuevo Proveedor",
      phone: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/no tenés proveedores todavía/i);

    const input = screen.getByLabelText(/nuevo proveedor/i);
    await user.type(input, "Nuevo Proveedor");
    await user.click(screen.getByRole("button", { name: /agregar/i }));

    expect(createSupplierMock).toHaveBeenCalledWith({ name: "Nuevo Proveedor" });
    await waitFor(() => expect(input).toHaveValue(""));
  });

  it("acepta un teléfono opcional al crear el proveedor", async () => {
    fetchSuppliersMock.mockResolvedValue([]);
    createSupplierMock.mockResolvedValue({
      id: 3,
      name: "Otro Proveedor",
      phone: "011 4444-5555",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/no tenés proveedores todavía/i);

    await user.type(screen.getByLabelText(/nuevo proveedor/i), "Otro Proveedor");
    await user.type(screen.getByLabelText(/teléfono/i), "011 4444-5555");
    await user.click(screen.getByRole("button", { name: /agregar/i }));

    expect(createSupplierMock).toHaveBeenCalledWith({
      name: "Otro Proveedor",
      phone: "011 4444-5555",
    });
  });

  it("muestra el título 'Proveedores', ya no 'Compras' (sección propia, fuera de Compras)", async () => {
    fetchSuppliersMock.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByRole("heading", { name: "Proveedores" })).toBeInTheDocument();
  });

  it("editar un proveedor: precarga sus datos, guarda con PATCH y sale del modo edición", async () => {
    fetchSuppliersMock.mockResolvedValue([distribuidoraSur]);
    updateSupplierMock.mockResolvedValue({
      ...distribuidoraSur,
      name: "Distribuidora Sur SA",
      phone: "011 9999-0000",
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Distribuidora Sur");

    await user.click(screen.getByRole("button", { name: /editar distribuidora sur/i }));

    const nameInput = screen.getByDisplayValue("Distribuidora Sur");
    const phoneInput = screen.getByDisplayValue("+54 11 1234-5678");
    await user.clear(nameInput);
    await user.type(nameInput, "Distribuidora Sur SA");
    await user.clear(phoneInput);
    await user.type(phoneInput, "011 9999-0000");
    await user.click(screen.getByRole("button", { name: /guardar/i }));

    expect(updateSupplierMock).toHaveBeenCalledWith(distribuidoraSur.id, {
      name: "Distribuidora Sur SA",
      phone: "011 9999-0000",
    });
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /guardar/i })).not.toBeInTheDocument(),
    );
  });

  it("cancelar la edición no llama a la API y descarta los cambios tipeados", async () => {
    fetchSuppliersMock.mockResolvedValue([distribuidoraSur]);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Distribuidora Sur");

    await user.click(screen.getByRole("button", { name: /editar distribuidora sur/i }));
    await user.type(screen.getByDisplayValue("Distribuidora Sur"), " (borrador)");
    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(updateSupplierMock).not.toHaveBeenCalled();
    expect(screen.getByText("Distribuidora Sur")).toBeInTheDocument();
  });
});
