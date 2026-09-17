import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { ProductDto } from "@stocknegozia/api-contracts";
import { SalesScreen } from "./SalesScreen";

// Separado de `SalesScreen.spec.tsx` para reducir (no eliminar del todo) una inestabilidad
// intermitente ya presente en el entorno de test de esta app antes de este cambio: el
// `notifyManager` de react-query agenda sus notificaciones con `setTimeout(fn, 0)` real, que es un
// timer de PROCESO (no de módulo ni de archivo) — un timer agendado por una mutación de un test
// puede terminar disparando durante otro test, incluso de otro archivo del mismo worker de Jest,
// contra un árbol ya desmontado. Se confirmó que esto no es específico de esta pantalla ni de esta
// función: `PurchasesScreen.spec.tsx` (sin relación con ventas/recibos) falla de la misma manera de
// forma intermitente en corridas de la suite completa. Si algún test de este archivo falla
// puntualmente con "Unable to find an element with text: Coca-Cola 2L" o un timeout genérico,
// reintentar la corrida antes de asumir una regresión real — no se encontró una forma de eliminar
// esta fuente de flakiness sin degradar la suite completa (se intentó un drenaje global de timers en
// `setupFilesAfterEnv` y empeoró tanto la tasa de fallos como el tiempo total, ver historial).
jest.mock("@/api/endpoints/products", () => ({
  fetchProducts: jest.fn(),
}));
jest.mock("@/api/endpoints/sales", () => ({
  createSale: jest.fn(),
}));
jest.mock("@/api/endpoints/receipt", () => ({
  downloadSaleReceipt: jest.fn(),
}));
jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ signOut: jest.fn() }),
}));
jest.mock("@/hooks/useDebouncedValue", () => ({
  useDebouncedValue: (value: string) => value,
}));

import { fetchProducts } from "@/api/endpoints/products";
import { downloadSaleReceipt } from "@/api/endpoints/receipt";
import { createSale } from "@/api/endpoints/sales";

const mockedFetchProducts = jest.mocked(fetchProducts);
const mockedCreateSale = jest.mocked(createSale);
const mockedDownloadSaleReceipt = jest.mocked(downloadSaleReceipt);

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

describe("SalesScreen — recibo PDF", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFetchProducts.mockResolvedValue([cocaCola]);
    mockedCreateSale.mockResolvedValue({
      id: 10,
      status: "completed",
      total: 1200,
      createdAt: "2026-01-01T00:00:00.000Z",
      cancelledAt: null,
      items: [{ id: 1, productId: cocaCola.id, quantity: 1, unitPrice: 1200, subtotal: 1200 }],
    });
  });

  afterEach(async () => {
    await cleanup();
  });

  it("sin tildar el checkbox (default), confirmar la venta no descarga ningún recibo", async () => {
    await renderWithClient(<SalesScreen />);
    fireEvent.press(await screen.findByText("Coca-Cola 2L"));
    await waitFor(() => expect(screen.getByTestId("confirm-sale")).not.toBeDisabled());
    fireEvent.press(screen.getByTestId("confirm-sale"));

    await waitFor(() => expect(screen.getByText("Venta registrada correctamente.")).toBeTruthy());
    expect(mockedDownloadSaleReceipt).not.toHaveBeenCalled();
  });

  it("con el checkbox tildado, confirmar la venta descarga el recibo de la venta creada", async () => {
    mockedDownloadSaleReceipt.mockResolvedValue(undefined);

    await renderWithClient(<SalesScreen />);
    fireEvent.press(await screen.findByText("Coca-Cola 2L"));
    fireEvent.press(screen.getByTestId("generate-receipt"));
    await waitFor(() => expect(screen.getByTestId("confirm-sale")).not.toBeDisabled());
    fireEvent.press(screen.getByTestId("confirm-sale"));

    await waitFor(() => expect(screen.getByText("Venta registrada correctamente.")).toBeTruthy());
    expect(mockedDownloadSaleReceipt).toHaveBeenCalledWith(10, expect.anything());
    // Espera a que la promesa de descarga termine de resolverse — si no, queda una actualización
    // de estado pendiente que puede filtrarse al siguiente test.
    await mockedDownloadSaleReceipt.mock.results[0]!.value;
  });

  it("si falla la descarga del recibo, la venta sigue mostrando éxito y el error se avisa aparte", async () => {
    mockedDownloadSaleReceipt.mockRejectedValue(new Error("No se pudo conectar con el backend"));

    await renderWithClient(<SalesScreen />);
    fireEvent.press(await screen.findByText("Coca-Cola 2L"));
    fireEvent.press(screen.getByTestId("generate-receipt"));
    await waitFor(() => expect(screen.getByTestId("confirm-sale")).not.toBeDisabled());
    fireEvent.press(screen.getByTestId("confirm-sale"));

    await waitFor(() => expect(mockedDownloadSaleReceipt).toHaveBeenCalled());
    await mockedDownloadSaleReceipt.mock.results[0]!.value.catch(() => {});

    expect(screen.getByText("Venta registrada correctamente.")).toBeTruthy();
    expect(screen.getByText("No se pudo conectar con el backend")).toBeTruthy();
  });
});
