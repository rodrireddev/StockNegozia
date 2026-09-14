import type { SupplierDto } from "@stocknegozia/api-contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SuppliersPage } from "./SuppliersPage";

const { fetchSuppliersMock, createSupplierMock } = vi.hoisted(() => ({
  fetchSuppliersMock: vi.fn(),
  createSupplierMock: vi.fn(),
}));

vi.mock("@/features/suppliers/api/suppliers.api", () => ({
  fetchSuppliers: fetchSuppliersMock,
  createSupplier: createSupplierMock,
}));

const distribuidoraSur: SupplierDto = {
  id: 1,
  name: "Distribuidora Sur",
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

  it("lista los proveedores existentes", async () => {
    fetchSuppliersMock.mockResolvedValue([distribuidoraSur]);
    renderPage();

    expect(await screen.findByText("Distribuidora Sur")).toBeInTheDocument();
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
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/no tenés proveedores todavía/i);

    const input = screen.getByLabelText(/nuevo proveedor/i);
    await user.type(input, "Nuevo Proveedor");
    await user.click(screen.getByRole("button", { name: /agregar/i }));

    expect(createSupplierMock).toHaveBeenCalledWith({ name: "Nuevo Proveedor" });
    await screen.findByDisplayValue("");
  });
});
