import type { ProductDto, ProfitEntryDto } from "@stocknegozia/api-contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfitsHistoryPage } from "./ProfitsHistoryPage";

const { fetchProfitsMock, fetchProductsMock } = vi.hoisted(() => ({
  fetchProfitsMock: vi.fn(),
  fetchProductsMock: vi.fn(),
}));

vi.mock("@/features/profits/api/profits.api", () => ({
  fetchProfits: fetchProfitsMock,
}));
vi.mock("@/features/products/api/products.api", () => ({
  fetchProducts: fetchProductsMock,
}));

function makeProduct(overrides: Partial<ProductDto> & { id: number }): ProductDto {
  return {
    name: "Producto",
    sku: `SKU-${overrides.id}`,
    barcode: null,
    description: null,
    categoryId: null,
    categoryName: null,
    purchasePrice: 800,
    salePrice: 1200,
    stock: 10,
    minimumStock: 2,
    stockStatus: "normal",
    image: null,
    active: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeEntry(overrides: Partial<ProfitEntryDto> & { id: number }): ProfitEntryDto {
  return {
    saleId: 1,
    productId: 1,
    productName: "Coca-Cola 2L",
    quantity: 2,
    unitPrice: 1200,
    unitCost: 800,
    revenue: 2400,
    cost: 1600,
    profit: 800,
    deviceName: null,
    deviceType: null,
    createdAt: "2026-01-01T12:00:00.000Z",
    ...overrides,
  };
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ProfitsHistoryPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  fetchProfitsMock.mockReset();
  fetchProductsMock.mockReset();
  fetchProductsMock.mockResolvedValue([makeProduct({ id: 1, name: "Coca-Cola 2L" })]);
});

describe("ProfitsHistoryPage", () => {
  it("muestra un estado de carga mientras se consulta el historial", () => {
    fetchProfitsMock.mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByText(/cargando ganancias/i)).toBeInTheDocument();
  });

  it("muestra un mensaje amigable si falla la carga", async () => {
    fetchProfitsMock.mockRejectedValue(new TypeError("Failed to fetch"));
    renderPage();

    const message = await screen.findByText(/no se pudo cargar el historial/i);
    expect(message.textContent).not.toMatch(/failed to fetch/i);
  });

  it("muestra un estado vacío cuando no hay ganancias", async () => {
    fetchProfitsMock.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText(/todavía no hay ganancias registradas/i)).toBeInTheDocument();
  });

  it("renderiza cada línea con producto, vendido, costo, ganancia y vendedor, más el total de la lista", async () => {
    fetchProfitsMock.mockResolvedValue([
      makeEntry({ id: 1, productName: "Coca-Cola 2L", revenue: 2400, cost: 1600, profit: 800 }),
      makeEntry({
        id: 2,
        productName: "Agua 500ml",
        revenue: 600,
        cost: 500,
        profit: 100,
        deviceName: "Rodrigo",
        deviceType: "desktop",
      }),
    ]);
    renderPage();

    expect(await screen.findByRole("cell", { name: "Coca-Cola 2L" })).toBeInTheDocument();
    expect(await screen.findByRole("cell", { name: "Agua 500ml" })).toBeInTheDocument();
    expect(await screen.findByText("Rodrigo (Escritorio)")).toBeInTheDocument();

    // Total combinado de ambas líneas: $ 3.000,00 vendido, $ 900,00 de ganancia.
    expect(await screen.findByText("$ 3.000,00")).toBeInTheDocument();
    expect(await screen.findByText("$ 900,00")).toBeInTheDocument();
  });

  it("una venta sin dispositivo asociado muestra '—' en Vendedor, nunca un nombre inventado", async () => {
    fetchProfitsMock.mockResolvedValue([makeEntry({ id: 1, deviceName: null, deviceType: null })]);
    renderPage();

    expect(await screen.findByRole("cell", { name: "—" })).toBeInTheDocument();
  });

  it("filtrar por producto vuelve a consultar el historial con ese filtro", async () => {
    fetchProfitsMock.mockResolvedValue([]);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/todavía no hay ganancias/i);

    await user.selectOptions(screen.getByDisplayValue("Todos los productos"), "1");

    await waitFor(() => {
      expect(fetchProfitsMock).toHaveBeenLastCalledWith(expect.objectContaining({ productId: 1 }));
    });
  });
});
