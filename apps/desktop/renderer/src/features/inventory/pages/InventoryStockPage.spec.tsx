import type { ProductDto } from "@stocknegozia/api-contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InventoryStockPage } from "./InventoryStockPage";

const { fetchProductsMock, fetchCategoriesMock } = vi.hoisted(() => ({
  fetchProductsMock: vi.fn(),
  fetchCategoriesMock: vi.fn(),
}));

vi.mock("@/features/products/api/products.api", () => ({
  fetchProducts: fetchProductsMock,
}));
vi.mock("@/features/products/api/categories.api", () => ({
  fetchCategories: fetchCategoriesMock,
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

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <InventoryStockPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  fetchProductsMock.mockReset();
  fetchCategoriesMock.mockReset();
  fetchCategoriesMock.mockResolvedValue([]);
});

describe("InventoryStockPage", () => {
  it("muestra un estado de carga mientras se consulta el stock", () => {
    fetchProductsMock.mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByText(/cargando stock/i)).toBeInTheDocument();
  });

  it("muestra un mensaje amigable si falla la carga", async () => {
    fetchProductsMock.mockRejectedValue(new TypeError("Failed to fetch"));
    renderPage();

    const message = await screen.findByText(/no se pudo cargar el inventario/i);
    expect(message.textContent).not.toMatch(/failed to fetch/i);
  });

  it("muestra un estado vacío cuando no hay productos", async () => {
    fetchProductsMock.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText(/no tenés productos todavía/i)).toBeInTheDocument();
  });

  it("lista el stock actual de cada producto con su categoría", async () => {
    fetchProductsMock.mockResolvedValue([
      makeProduct({ id: 1, name: "Coca-Cola 2L", categoryName: "Bebidas", stock: 14 }),
    ]);
    renderPage();

    expect(await screen.findByText("Coca-Cola 2L")).toBeInTheDocument();
    expect(screen.getByText("Bebidas")).toBeInTheDocument();
    expect(screen.getByText("14")).toBeInTheDocument();
  });

  it("el botón Ajustar abre el diálogo de ajuste de stock ya existente para ese producto", async () => {
    fetchProductsMock.mockResolvedValue([makeProduct({ id: 1, name: "Coca-Cola 2L" })]);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Coca-Cola 2L");

    await user.click(screen.getByRole("button", { name: /ajustar/i }));

    expect(screen.getByText("Ajustar stock")).toBeInTheDocument();
    expect(screen.getByText(/Coca-Cola 2L \(SKU SKU-1\)/)).toBeInTheDocument();
  });
});
