import type { CategoryDto, ProductDto } from "@stocknegozia/api-contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InventoryCategoriesPage } from "./InventoryCategoriesPage";

const { fetchCategoriesMock, fetchProductsMock } = vi.hoisted(() => ({
  fetchCategoriesMock: vi.fn(),
  fetchProductsMock: vi.fn(),
}));

vi.mock("@/features/products/api/categories.api", () => ({
  fetchCategories: fetchCategoriesMock,
}));
vi.mock("@/features/products/api/products.api", () => ({
  fetchProducts: fetchProductsMock,
}));

const bebidas: CategoryDto = { id: 1, name: "Bebidas" };

function makeProduct(overrides: Partial<ProductDto> & { id: number }): ProductDto {
  return {
    name: "Producto",
    sku: `SKU-${overrides.id}`,
    barcode: null,
    description: null,
    categoryId: null,
    categoryName: null,
    purchasePrice: 0,
    salePrice: 0,
    stock: 0,
    minimumStock: 0,
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
        <InventoryCategoriesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  fetchCategoriesMock.mockReset();
  fetchProductsMock.mockReset();
});

describe("InventoryCategoriesPage", () => {
  it("muestra un estado de carga mientras se consultan las categorías", () => {
    fetchCategoriesMock.mockReturnValue(new Promise(() => {}));
    fetchProductsMock.mockResolvedValue([]);
    renderPage();

    expect(screen.getByText(/cargando categorías/i)).toBeInTheDocument();
  });

  it("muestra un mensaje amigable si falla la carga", async () => {
    fetchCategoriesMock.mockRejectedValue(new TypeError("Failed to fetch"));
    fetchProductsMock.mockResolvedValue([]);
    renderPage();

    const message = await screen.findByText(/no se pudo cargar las categorías/i);
    expect(message.textContent).not.toMatch(/failed to fetch/i);
  });

  it("muestra un estado vacío cuando no hay categorías", async () => {
    fetchCategoriesMock.mockResolvedValue([]);
    fetchProductsMock.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText(/no tenés categorías todavía/i)).toBeInTheDocument();
  });

  it("lista las categorías con la cantidad de productos que tiene cada una", async () => {
    fetchCategoriesMock.mockResolvedValue([bebidas]);
    fetchProductsMock.mockResolvedValue([
      makeProduct({ id: 1, categoryId: 1, categoryName: "Bebidas" }),
      makeProduct({ id: 2, categoryId: 1, categoryName: "Bebidas" }),
    ]);
    renderPage();

    expect(await screen.findByText("Bebidas")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});
