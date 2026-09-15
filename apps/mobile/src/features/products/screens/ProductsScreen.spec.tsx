import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react-native";
import type { ProductDto } from "@stocknegozia/api-contracts";
import { ProductsScreen } from "./ProductsScreen";

jest.mock("@/api/endpoints/products", () => ({
  fetchProducts: jest.fn(),
}));
jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ signOut: jest.fn() }),
}));

import { fetchProducts } from "@/api/endpoints/products";

const mockedFetchProducts = jest.mocked(fetchProducts);

async function renderWithClient(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const sampleProduct: ProductDto = {
  id: 1,
  name: "Coca-Cola 500ml",
  sku: "COC-500",
  barcode: null,
  description: null,
  categoryId: null,
  categoryName: "Bebidas",
  purchasePrice: 500,
  salePrice: 900,
  stock: 12,
  minimumStock: 5,
  stockStatus: "normal",
  image: null,
  active: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("ProductsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // El test de "loading" deja una promesa de `fetchProducts` colgada a propósito — sin este
    // cleanup explícito, ese árbol montado (y el observer de React Query asociado) sobrevive
    // entre tests y hace que el siguiente `render()` tarde muchísimo en asentarse.
    await cleanup();
  });

  it("muestra un estado de carga mientras se resuelve la request", async () => {
    mockedFetchProducts.mockReturnValue(new Promise(() => {}));
    await renderWithClient(<ProductsScreen />);
    expect(screen.getByText("Cargando productos…")).toBeTruthy();
  });

  it("muestra un estado de error con opción de reintentar si la request falla", async () => {
    mockedFetchProducts.mockRejectedValue(new Error("network down"));
    await renderWithClient(<ProductsScreen />);
    await waitFor(() =>
      expect(screen.getByText("No se pudieron cargar los productos.")).toBeTruthy(),
    );
    expect(screen.getByText("Reintentar")).toBeTruthy();
  });

  it("muestra un estado vacío cuando no hay productos", async () => {
    mockedFetchProducts.mockResolvedValue([]);
    await renderWithClient(<ProductsScreen />);
    await waitFor(() => expect(screen.getByText("Todavía no hay productos")).toBeTruthy());
  });

  it("renderiza la lista de productos reales devueltos por el backend", async () => {
    mockedFetchProducts.mockResolvedValue([sampleProduct]);
    await renderWithClient(<ProductsScreen />);
    await waitFor(() => expect(screen.getByText("Coca-Cola 500ml")).toBeTruthy());
    expect(screen.getByText("COC-500 · Bebidas")).toBeTruthy();
  });
});
