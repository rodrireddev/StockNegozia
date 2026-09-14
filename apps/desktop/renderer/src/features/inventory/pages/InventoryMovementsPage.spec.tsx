import type { ProductDto, StockMovementDto } from "@stocknegozia/api-contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InventoryMovementsPage } from "./InventoryMovementsPage";

const { fetchStockMovementsMock, fetchProductsMock } = vi.hoisted(() => ({
  fetchStockMovementsMock: vi.fn(),
  fetchProductsMock: vi.fn(),
}));

vi.mock("@/features/inventory/api/stock-movements.api", () => ({
  fetchStockMovements: fetchStockMovementsMock,
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

function makeMovement(overrides: Partial<StockMovementDto> & { id: number }): StockMovementDto {
  return {
    productId: 1,
    type: "ADJUSTMENT",
    direction: "OUT",
    quantity: 1,
    stockBefore: 10,
    stockAfter: 9,
    saleId: null,
    purchaseId: null,
    requestId: null,
    reason: null,
    unitValue: null,
    createdAt: "2026-01-01T12:00:00.000Z",
    ...overrides,
  };
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <InventoryMovementsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  fetchStockMovementsMock.mockReset();
  fetchProductsMock.mockReset();
  fetchProductsMock.mockResolvedValue([makeProduct({ id: 1, name: "Coca-Cola 2L" })]);
});

describe("InventoryMovementsPage", () => {
  it("muestra un estado de carga mientras se consulta el historial", () => {
    fetchStockMovementsMock.mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByText(/cargando movimientos/i)).toBeInTheDocument();
  });

  it("muestra un mensaje amigable si falla la carga", async () => {
    fetchStockMovementsMock.mockRejectedValue(new TypeError("Failed to fetch"));
    renderPage();

    const message = await screen.findByText(/no se pudo cargar el historial/i);
    expect(message.textContent).not.toMatch(/failed to fetch/i);
  });

  it("muestra un estado vacío cuando no hay movimientos", async () => {
    fetchStockMovementsMock.mockResolvedValue([]);
    renderPage();

    expect(
      await screen.findByText(/todavía no hay movimientos de stock registrados/i),
    ).toBeInTheDocument();
  });

  it("renderiza el tipo traducido, la cantidad con signo, el precio histórico y la referencia de compra/venta", async () => {
    fetchStockMovementsMock.mockResolvedValue([
      makeMovement({
        id: 1,
        type: "PURCHASE",
        direction: "IN",
        quantity: 10,
        stockAfter: 20,
        purchaseId: 7,
        unitValue: 850,
      }),
      makeMovement({
        id: 2,
        type: "SALE",
        direction: "OUT",
        quantity: 2,
        stockAfter: 18,
        saleId: 3,
        unitValue: 1200,
      }),
    ]);
    renderPage();

    // `role: "cell"` porque "Compra"/"Venta" también existen como <option> del filtro de tipo —
    // se busca específicamente la celda de la tabla, no cualquier texto en la página.
    expect(await screen.findByRole("cell", { name: "Compra" })).toBeInTheDocument();
    expect(await screen.findByText("+10")).toBeInTheDocument();
    expect(await screen.findByText("$ 850,00")).toBeInTheDocument();
    expect(await screen.findByText("Compra #7")).toBeInTheDocument();

    expect(await screen.findByRole("cell", { name: "Venta" })).toBeInTheDocument();
    expect(await screen.findByText("-2")).toBeInTheDocument();
    expect(await screen.findByText("$ 1.200,00")).toBeInTheDocument();
    expect(await screen.findByText("Venta #3")).toBeInTheDocument();
  });

  it("un ajuste sin precio de operación muestra '—', nunca un precio inventado", async () => {
    fetchStockMovementsMock.mockResolvedValue([
      makeMovement({
        id: 1,
        type: "ADJUSTMENT",
        direction: "OUT",
        quantity: 1,
        unitValue: null,
        reason: "Conteo físico", // fija la columna "Referencia / motivo" para no ambigüar con "—"
      }),
    ]);
    renderPage();

    expect(await screen.findByRole("cell", { name: "Ajuste" })).toBeInTheDocument();
    expect(await screen.findByRole("cell", { name: "—" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Conteo físico" })).toBeInTheDocument();
  });

  it("filtrar por tipo vuelve a consultar el historial con ese filtro", async () => {
    fetchStockMovementsMock.mockResolvedValue([]);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/todavía no hay movimientos/i);

    await user.selectOptions(screen.getByDisplayValue("Todos los tipos"), "PURCHASE");

    await waitFor(() => {
      expect(fetchStockMovementsMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ type: "PURCHASE" }),
      );
    });
  });
});
