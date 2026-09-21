import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { ProductDto, ProfitEntryDto } from "@stocknegozia/api-contracts";
import { ProfitsScreen } from "./ProfitsScreen";

jest.mock("@/api/endpoints/products", () => ({
  fetchProducts: jest.fn(),
}));
jest.mock("@/api/endpoints/profits", () => ({
  fetchProfits: jest.fn(),
  fetchDailyProfits: jest.fn(),
}));
jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ signOut: jest.fn() }),
}));

import { fetchProducts } from "@/api/endpoints/products";
import { fetchDailyProfits, fetchProfits } from "@/api/endpoints/profits";

const mockedFetchProducts = jest.mocked(fetchProducts);
const mockedFetchProfits = jest.mocked(fetchProfits);
const mockedFetchDailyProfits = jest.mocked(fetchDailyProfits);

const cocaCola: ProductDto = {
  id: 1,
  name: "Coca-Cola 2L",
  sku: "0012",
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
};

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

async function renderWithClient(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("ProfitsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFetchProducts.mockResolvedValue([cocaCola]);
    mockedFetchDailyProfits.mockResolvedValue([]);
  });

  afterEach(async () => {
    await cleanup();
  });

  it("muestra un estado de carga mientras se consulta el historial", async () => {
    mockedFetchProfits.mockReturnValue(new Promise(() => {}));
    await renderWithClient(<ProfitsScreen />);

    expect(screen.getByText(/cargando ganancias/i)).toBeTruthy();
  });

  it("muestra un mensaje amigable si falla la carga", async () => {
    mockedFetchProfits.mockRejectedValue(new Error("network down"));
    await renderWithClient(<ProfitsScreen />);

    expect(await screen.findByText(/no se pudo cargar el historial/i)).toBeTruthy();
  });

  it("muestra un estado vacío cuando no hay ganancias", async () => {
    mockedFetchProfits.mockResolvedValue([]);
    await renderWithClient(<ProfitsScreen />);

    expect(await screen.findByText(/todavía no hay ganancias/i)).toBeTruthy();
  });

  it("renderiza el producto, vendido, costo, ganancia y vendedor de cada línea, más el total", async () => {
    mockedFetchProfits.mockResolvedValue([
      makeEntry({ id: 1, deviceName: "Rodrigo", deviceType: "desktop" }),
    ]);
    await renderWithClient(<ProfitsScreen />);

    expect(await screen.findByText("Coca-Cola 2L")).toBeTruthy();
    expect(screen.getByText("Vendedor: Rodrigo (Escritorio)")).toBeTruthy();
    // Costo total de la línea ($ 1.600,00) y ganancia total ($ 800,00) — cada uno aparece dos
    // veces: una en el total de la lista, otra en la línea (misma línea, único item).
    expect(screen.getAllByText("$ 1.600,00")).toHaveLength(2);
    expect(screen.getAllByText("$ 800,00")).toHaveLength(2);
  });

  it("una venta sin dispositivo asociado no muestra la línea 'Vendedor'", async () => {
    mockedFetchProfits.mockResolvedValue([makeEntry({ id: 1, deviceName: null, deviceType: null })]);
    await renderWithClient(<ProfitsScreen />);

    await screen.findByText("Coca-Cola 2L");
    expect(screen.queryByText(/vendedor:/i)).toBeNull();
  });

  it("filtrar por producto vuelve a consultar el historial con ese filtro", async () => {
    mockedFetchProfits.mockResolvedValue([]);
    await renderWithClient(<ProfitsScreen />);
    await screen.findByText(/todavía no hay ganancias/i);

    fireEvent.press(screen.getByText("Todos los productos"));
    fireEvent.press(await screen.findByText("Coca-Cola 2L"));

    await waitFor(() => {
      expect(mockedFetchProfits).toHaveBeenLastCalledWith(expect.objectContaining({ productId: 1 }));
    });
  });

  it("el gráfico semanal se muestra al cambiar de pestaña", async () => {
    mockedFetchProfits.mockResolvedValue([]);
    mockedFetchDailyProfits.mockResolvedValue([
      { date: "2026-01-01", label: "Jue", revenue: 1200, cost: 800, profit: 400 },
    ]);
    await renderWithClient(<ProfitsScreen />);
    await screen.findByText(/todavía no hay ganancias/i);

    fireEvent.press(screen.getByText("Gráfico semanal"));

    expect(await screen.findByText("Últimos 7 días")).toBeTruthy();
    expect(screen.getByText("Jue")).toBeTruthy();
  });
});
