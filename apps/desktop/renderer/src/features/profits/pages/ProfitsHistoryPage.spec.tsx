import type { ProductDto, ProfitLedgerEntryDto } from "@stocknegozia/api-contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfitsHistoryPage } from "./ProfitsHistoryPage";

const { fetchProfitLedgerMock, fetchProductsMock } = vi.hoisted(() => ({
  fetchProfitLedgerMock: vi.fn(),
  fetchProductsMock: vi.fn(),
}));

vi.mock("@/features/profits/api/profits.api", () => ({
  fetchProfitLedger: fetchProfitLedgerMock,
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

function makeSaleEntry(
  overrides: Partial<ProfitLedgerEntryDto> & { id: number },
): ProfitLedgerEntryDto {
  return {
    kind: "sale",
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
  } as ProfitLedgerEntryDto;
}

function makeCashAdjustmentEntry(
  overrides: Partial<ProfitLedgerEntryDto> & { id: number; direction: "IN" | "OUT" },
): ProfitLedgerEntryDto {
  return {
    kind: "cashAdjustment",
    amount: 500,
    reason: "Pago sueldo",
    createdAt: "2026-01-01T12:00:00.000Z",
    ...overrides,
  } as ProfitLedgerEntryDto;
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
  fetchProfitLedgerMock.mockReset();
  fetchProductsMock.mockReset();
  fetchProductsMock.mockResolvedValue([makeProduct({ id: 1, name: "Coca-Cola 2L" })]);
});

describe("ProfitsHistoryPage", () => {
  it("muestra un estado de carga mientras se consulta el historial", () => {
    fetchProfitLedgerMock.mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByText(/cargando ganancias/i)).toBeInTheDocument();
  });

  it("muestra un mensaje amigable si falla la carga", async () => {
    fetchProfitLedgerMock.mockRejectedValue(new TypeError("Failed to fetch"));
    renderPage();

    const message = await screen.findByText(/no se pudo cargar el historial/i);
    expect(message.textContent).not.toMatch(/failed to fetch/i);
  });

  it("muestra un estado vacío cuando no hay ganancias", async () => {
    fetchProfitLedgerMock.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText(/todavía no hay ganancias registradas/i)).toBeInTheDocument();
  });

  it("renderiza cada línea con producto, vendido, costo, ganancia y vendedor, más el total de la lista", async () => {
    fetchProfitLedgerMock.mockResolvedValue([
      makeSaleEntry({ id: 1, productName: "Coca-Cola 2L", revenue: 2400, cost: 1600, profit: 800 }),
      makeSaleEntry({
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
    fetchProfitLedgerMock.mockResolvedValue([makeSaleEntry({ id: 1, deviceName: null, deviceType: null })]);
    renderPage();

    expect(await screen.findByRole("cell", { name: "—" })).toBeInTheDocument();
  });

  it("un retiro de caja aparece como línea propia y resta de la ganancia total sin tocar vendido/costo", async () => {
    fetchProfitLedgerMock.mockResolvedValue([
      makeSaleEntry({ id: 1, revenue: 2400, cost: 1600, profit: 800 }),
      makeCashAdjustmentEntry({ id: 2, direction: "OUT", amount: 300, reason: "Pago sueldo Juan" }),
    ]);
    renderPage();

    expect(await screen.findByRole("cell", { name: "Retiro de caja" })).toBeInTheDocument();
    expect(await screen.findByRole("cell", { name: "Pago sueldo Juan" })).toBeInTheDocument();
    // Vendido/costo siguen siendo sólo de la venta: $ 2.400,00 aparece en el resumen y en la fila
    // de la venta (única línea de venta), nunca duplicado por el retiro.
    expect(await screen.findAllByText("$ 2.400,00")).toHaveLength(2);
    // Ganancia total: 800 (venta) - 300 (retiro) = 500.
    expect(await screen.findByText("$ 500,00")).toBeInTheDocument();
  });

  it("filtrar por producto vuelve a consultar el historial con ese filtro", async () => {
    fetchProfitLedgerMock.mockResolvedValue([]);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/todavía no hay ganancias/i);

    await user.selectOptions(screen.getByDisplayValue("Todos los productos"), "1");

    await waitFor(() => {
      expect(fetchProfitLedgerMock).toHaveBeenLastCalledWith(expect.objectContaining({ productId: 1 }));
    });
  });
});
