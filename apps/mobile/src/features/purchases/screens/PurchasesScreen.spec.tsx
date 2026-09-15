import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { ProductDto, SupplierDto } from "@stocknegozia/api-contracts";
import { PurchasesScreen } from "./PurchasesScreen";

jest.mock("@/api/endpoints/products", () => ({
  fetchProducts: jest.fn(),
}));
jest.mock("@/api/endpoints/purchases", () => ({
  createPurchase: jest.fn(),
}));
jest.mock("@/api/endpoints/suppliers", () => ({
  fetchSuppliers: jest.fn(),
  createSupplier: jest.fn(),
}));
jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ signOut: jest.fn() }),
}));
jest.mock("@/hooks/useDebouncedValue", () => ({
  useDebouncedValue: (value: string) => value,
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

import { fetchProducts } from "@/api/endpoints/products";
import { createPurchase } from "@/api/endpoints/purchases";
import { fetchSuppliers } from "@/api/endpoints/suppliers";

const mockedFetchProducts = jest.mocked(fetchProducts);
const mockedCreatePurchase = jest.mocked(createPurchase);
const mockedFetchSuppliers = jest.mocked(fetchSuppliers);

const cocaCola: ProductDto = {
  id: 1,
  name: "Coca-Cola 2L",
  sku: "0012",
  barcode: null,
  description: null,
  categoryId: null,
  categoryName: null,
  purchasePrice: 900,
  salePrice: 1200,
  stock: 10,
  minimumStock: 2,
  stockStatus: "normal",
  image: null,
  active: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const supplier: SupplierDto = { id: 5, name: "Distribuidora Sur", createdAt: "2026-01-01T00:00:00.000Z" };

async function renderWithClient(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("PurchasesScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFetchProducts.mockResolvedValue([cocaCola]);
    mockedFetchSuppliers.mockResolvedValue([supplier]);
  });

  afterEach(async () => {
    await cleanup();
  });

  it("impide confirmar sin proveedor, con un mensaje amigable, sin llamar al backend", async () => {
    await renderWithClient(<PurchasesScreen />);
    fireEvent.press(await screen.findByText("Coca-Cola 2L"));
    // Espera a que el carrito refleje el producto agregado (aparece una segunda vez, en "Compra
    // actual") antes de tocar Confirmar — mismo criterio que `SalesScreen.spec.tsx`.
    await waitFor(() => expect(screen.getAllByText("Coca-Cola 2L")).toHaveLength(2));

    fireEvent.press(screen.getByTestId("confirm-purchase"));

    await waitFor(() =>
      expect(
        screen.getByText("Seleccioná un proveedor antes de confirmar la compra."),
      ).toBeTruthy(),
    );
    expect(mockedCreatePurchase).not.toHaveBeenCalled();
  });
});
