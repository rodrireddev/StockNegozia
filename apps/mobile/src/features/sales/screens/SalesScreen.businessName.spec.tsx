import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { ProductDto } from "@stocknegozia/api-contracts";
import { SalesScreen } from "./SalesScreen";

// Separado de `SalesScreen.spec.tsx`/`SalesScreen.receipt.spec.tsx` por el mismo motivo que ya
// separa esos dos entre sí (ver el comentario en `SalesScreen.receipt.spec.tsx`): timers reales de
// react-query que pueden filtrarse entre tests/archivos del mismo worker de Jest.
jest.mock("@/api/endpoints/products", () => ({
  fetchProducts: jest.fn(),
}));
jest.mock("@/api/endpoints/sales", () => ({
  createSale: jest.fn(),
}));
jest.mock("@/api/endpoints/receipt", () => ({
  downloadSaleReceipt: jest.fn(),
}));
jest.mock("@/api/endpoints/settings", () => ({
  fetchPaymentTerms: jest.fn(() =>
    Promise.resolve(jest.requireActual("@stocknegozia/shared").DEFAULT_PAYMENT_TERMS),
  ),
  updatePaymentTerms: jest.fn(),
  fetchSettings: jest.fn(),
  updateSettings: jest.fn(),
}));
jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ signOut: jest.fn() }),
}));
jest.mock("@/hooks/useDebouncedValue", () => ({
  useDebouncedValue: (value: string) => value,
}));

import { fetchProducts } from "@/api/endpoints/products";
import { createSale } from "@/api/endpoints/sales";
import { fetchSettings } from "@/api/endpoints/settings";

const mockedFetchProducts = jest.mocked(fetchProducts);
const mockedCreateSale = jest.mocked(createSale);
const mockedFetchSettings = jest.mocked(fetchSettings);

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

// Nota: no hay tests acá que verifiquen que se MUESTRA el modal de nombre de negocio
// (`MissingBusinessNameModal`) — el `<Modal>` de React Native no llega a renderizar su contenido
// en el entorno de test de esta app (reproducido incluso con un `<Modal>` mínimo aislado, sin
// relación con este feature ni con `StockAdjustModal`, que tampoco tiene tests). Es un problema de
// infraestructura de testing preexistente, no de este código — la lógica ya se verificó
// manualmente (ver PR/commit). Lo que sí se puede verificar de forma confiable acá es el
// comportamiento observable que no depende de que el modal se pinte.
describe("SalesScreen — nombre del negocio", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFetchProducts.mockResolvedValue([cocaCola]);
    mockedCreateSale.mockResolvedValue({
      id: 10,
      status: "completed",
      total: 1200,
      createdAt: "2026-01-01T00:00:00.000Z",
      cancelledAt: null,
      paymentMethods: [],
      payments: [],
      items: [{ id: 1, productId: cocaCola.id, quantity: 1, unitPrice: 1200, subtotal: 1200 }],
    });
  });

  afterEach(async () => {
    await cleanup();
  });

  // Un solo test acá a propósito: este entorno de test (RN + Jest + react-query) tiene una
  // inestabilidad preexistente donde el PRIMER test de un archivo pasa confiablemente pero los
  // siguientes se corrompen (timers reales de react-query que se filtran entre tests, ver el
  // comentario de arriba) — se reprodujo igual con este test en su propio archivo nuevo, en el
  // archivo de recibo original, y en mobile-mini con mocks completamente distintos. No es
  // específico de este feature. Se prioriza un solo test confiable sobre varios inestables.
  it("sin nombre del negocio configurado, tildar el recibo y confirmar NO registra la venta", async () => {
    mockedFetchSettings.mockResolvedValue({ businessName: null });

    await renderWithClient(<SalesScreen />);
    fireEvent.press(await screen.findByText("Coca-Cola 2L"));
    await waitFor(() => expect(screen.getByTestId("open-checkout")).not.toBeDisabled());
    fireEvent.press(screen.getByTestId("open-checkout"));
    fireEvent.press(await screen.findByTestId("generate-receipt"));
    await waitFor(() => expect(screen.getByTestId("confirm-sale")).not.toBeDisabled());
    fireEvent.press(screen.getByTestId("confirm-sale"));

    // Se espera lo bastante para descartar que la venta se haya registrado igual.
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(mockedCreateSale).not.toHaveBeenCalled();
  });
});
