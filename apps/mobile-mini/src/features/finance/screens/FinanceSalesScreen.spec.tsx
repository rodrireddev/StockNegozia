import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { FinanceSummaryDto } from "@stocknegozia/api-contracts";
import { FinanceSalesScreen } from "./FinanceSalesScreen";

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ push: jest.fn(), setParams: jest.fn() }),
  Stack: { Screen: () => null },
}));
jest.mock("@/data/finance", () => ({
  fetchFinanceSummary: jest.fn(),
  fetchTopProducts: jest.fn(),
  fetchSaleLines: jest.fn(),
}));
jest.mock("@/data/sales", () => ({
  cancelSale: jest.fn(),
}));

import { fetchFinanceSummary, fetchSaleLines, fetchTopProducts } from "@/data/finance";
import { cancelSale } from "@/data/sales";

const summary: FinanceSummaryDto = {
  from: "2026-10-01T03:00:00.000Z",
  to: "2026-10-08T02:59:59.999Z",
  granularity: "day",
  sales: {
    count: 1,
    revenue: 2400,
    cost: 1600,
    profit: 800,
    marginPercent: 33.3,
    averageTicket: 2400,
    unitsSold: 2,
  },
  purchases: { count: 0, total: 0 },
  cash: { withdrawals: 0, withdrawalsCount: 0, deposits: 0, depositsCount: 0 },
  collections: { total: 2400, surcharges: 0, fees: 0, net: 2400, byMethod: [] },
  receivables: { soldOnAccount: 0, received: 0, outstanding: 0 },
  pendingSettlement: { amount: 0, count: 0, nextDate: null },
  series: [],
};

async function renderWithClient(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // `ConfirmDialog` usa `useSafeAreaInsets` — sin provider (y sin medidas iniciales) no renderiza.
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </SafeAreaProvider>,
  );
}

describe("FinanceSalesScreen — anular venta", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(fetchFinanceSummary).mockResolvedValue(summary);
    jest.mocked(fetchTopProducts).mockResolvedValue([]);
    jest.mocked(fetchSaleLines).mockResolvedValue([
      {
        id: 1,
        saleId: 42,
        productId: 7,
        productName: "Coca-Cola 2L",
        quantity: 2,
        unitPrice: 1200,
        unitCost: 800,
        revenue: 2400,
        cost: 1600,
        profit: 800,
        paymentMethods: ["cash"],
        createdAt: "2026-10-05T15:00:00.000Z",
      },
    ]);
    jest.mocked(cancelSale).mockResolvedValue({} as never);
  });

  afterEach(async () => {
    await cleanup();
  });

  it("tocar una línea y confirmar anula la venta completa a la que pertenece", async () => {
    await renderWithClient(<FinanceSalesScreen />);

    fireEvent.press(await screen.findByText("Coca-Cola 2L × 2"));
    expect(await screen.findByText("¿Anular la venta #42?")).toBeTruthy();
    fireEvent.press(screen.getByText("Anular venta"));

    await waitFor(() => expect(cancelSale).toHaveBeenCalledWith(42));
  });

  it("sin confirmar no anula nada", async () => {
    await renderWithClient(<FinanceSalesScreen />);

    fireEvent.press(await screen.findByText("Coca-Cola 2L × 2"));
    fireEvent.press(await screen.findByText("Cancelar"));

    expect(cancelSale).not.toHaveBeenCalled();
  });
});
