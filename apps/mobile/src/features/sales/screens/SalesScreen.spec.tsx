import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { ProductDto } from "@stocknegozia/api-contracts";
import { SalesScreen } from "./SalesScreen";

jest.mock("@/api/endpoints/products", () => ({
  fetchProducts: jest.fn(),
}));
jest.mock("@/api/endpoints/sales", () => ({
  createSale: jest.fn(),
}));
jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ signOut: jest.fn() }),
}));
// El debounce real (setTimeout 300ms) no aporta nada a estos tests y deja timers colgados entre
// tests que generan renders fuera de `act()` — se vuelve identidad para que la búsqueda responda
// en el mismo tick.
jest.mock("@/hooks/useDebouncedValue", () => ({
  useDebouncedValue: (value: string) => value,
}));

import { fetchProducts } from "@/api/endpoints/products";
import { createSale } from "@/api/endpoints/sales";

const mockedFetchProducts = jest.mocked(fetchProducts);
const mockedCreateSale = jest.mocked(createSale);

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

const cocaCola = makeProduct({ id: 1, name: "Coca-Cola 2L", sku: "0012", salePrice: 1200 });

async function renderWithClient(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("SalesScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFetchProducts.mockResolvedValue([cocaCola]);
  });

  afterEach(async () => {
    // Sin este cleanup explícito, un árbol montado con queries de React Query en vuelo puede
    // sobrevivir entre tests y romper el binding global de `screen` del siguiente — mismo
    // criterio que `ProductsScreen.spec.tsx`.
    await cleanup();
  });

  it("el botón de confirmar venta está deshabilitado con el carrito vacío", async () => {
    await renderWithClient(<SalesScreen />);
    await screen.findByText("Coca-Cola 2L");

    expect(screen.getByTestId("confirm-sale")).toBeDisabled();
  });

  it("tocar un producto lo agrega al carrito; tocarlo de nuevo incrementa la cantidad sin duplicar la línea", async () => {
    await renderWithClient(<SalesScreen />);
    const row = await screen.findByText("Coca-Cola 2L");

    fireEvent.press(row);
    await waitFor(() => expect(screen.getAllByText("Coca-Cola 2L")).toHaveLength(2));
    fireEvent.press(row);

    await waitFor(() => expect(screen.getByText("2")).toBeTruthy());
    expect(screen.getByTestId("confirm-sale")).not.toBeDisabled();
  });

  it("confirmar la venta: en éxito limpia el carrito y avisa", async () => {
    mockedCreateSale.mockResolvedValue({
      id: 10,
      status: "completed",
      total: 1200,
      createdAt: "2026-01-01T00:00:00.000Z",
      cancelledAt: null,
      items: [{ id: 1, productId: cocaCola.id, quantity: 1, unitPrice: 1200, subtotal: 1200 }],
    });

    await renderWithClient(<SalesScreen />);
    fireEvent.press(await screen.findByText("Coca-Cola 2L"));
    // Espera a que el botón refleje el carrito ya actualizado antes de tocarlo — sin esto, el
    // segundo `fireEvent.press` puede llegar antes de que React confirme el re-render disparado
    // por el primero.
    await waitFor(() => expect(screen.getByTestId("confirm-sale")).not.toBeDisabled());
    fireEvent.press(screen.getByTestId("confirm-sale"));

    await waitFor(() => expect(screen.getByText("Venta registrada correctamente.")).toBeTruthy());
    expect(mockedCreateSale).toHaveBeenCalledWith({
      items: [{ productId: cocaCola.id, quantity: 1 }],
    });
    // El carrito volvió a estar vacío.
    expect(screen.getByText("Carrito vacío")).toBeTruthy();
  });

  it("confirmar la venta: si el backend rechaza, conserva el carrito y muestra el error", async () => {
    mockedCreateSale.mockRejectedValue(new Error("Stock insuficiente"));

    await renderWithClient(<SalesScreen />);
    fireEvent.press(await screen.findByText("Coca-Cola 2L"));
    await waitFor(() => expect(screen.getByTestId("confirm-sale")).not.toBeDisabled());
    fireEvent.press(screen.getByTestId("confirm-sale"));

    await waitFor(() => expect(screen.getByText("Stock insuficiente")).toBeTruthy());
    expect(screen.getAllByText("Coca-Cola 2L")).toHaveLength(2);
  });
});
