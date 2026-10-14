import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react-native";
import type { FinanceSummaryDto } from "@stocknegozia/api-contracts";
import { FinanceHomeScreen } from "./FinanceHomeScreen";

const mockPush = jest.fn();
const mockSetParams = jest.fn();
let mockParams: { period?: string } = {};

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ push: mockPush, setParams: mockSetParams }),
  Stack: { Screen: () => null },
}));
jest.mock("@/api/endpoints/finance", () => ({
  fetchFinanceSummary: jest.fn(),
}));
jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ signOut: jest.fn() }),
}));

import { fetchFinanceSummary } from "@/api/endpoints/finance";

const mockedFetchFinanceSummary = jest.mocked(fetchFinanceSummary);

function makeSummary(): FinanceSummaryDto {
  return {
    from: "2026-10-01T03:00:00.000Z",
    to: "2026-10-08T02:59:59.999Z",
    granularity: "day",
    sales: {
      count: 4,
      revenue: 400_000_000,
      cost: 250_000_000,
      profit: 150_000_000,
      marginPercent: 37.5,
      averageTicket: 100_000_000,
      unitsSold: 4,
    },
    purchases: { count: 1, total: 80_000 },
    cash: { withdrawals: 90_000, withdrawalsCount: 3, deposits: 0, depositsCount: 0 },
    collections: { total: 400_000_000, surcharges: 0, fees: 0, net: 400_000_000, byMethod: [] },
    pendingSettlement: { amount: 200_000_000, count: 2, nextDate: "2026-10-12T03:00:00.000Z" },
    series: [],
  };
}

async function renderWithClient(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("FinanceHomeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
    mockedFetchFinanceSummary.mockResolvedValue(makeSummary());
  });

  afterEach(async () => {
    await cleanup();
  });

  it("muestra ventas, compras, retiros y cobros como tarjetas separadas", async () => {
    await renderWithClient(<FinanceHomeScreen />);
    expect(await screen.findByText("Ganancia por ventas")).toBeTruthy();
    expect(screen.getByText("Gastos en mercadería")).toBeTruthy();
    expect(screen.getByText("Retiros de caja")).toBeTruthy();
    expect(screen.getByText("Cobrado")).toBeTruthy();
    // El retiro no se resta de la ganancia.
    expect(screen.getByText(/150\.000\.000,00/)).toBeTruthy();
    expect(screen.getByText(/90\.000,00/)).toBeTruthy();
    expect(screen.getByText(/Por acreditar/)).toBeTruthy();
  });

  it("cada tarjeta abre su vista con el mismo período", async () => {
    mockParams = { period: "month" };
    await renderWithClient(<FinanceHomeScreen />);
    fireEvent.press(await screen.findByTestId("finance-cash"));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/profits/cash",
      params: { period: "month" },
    });
  });

  it("cambiar el período actualiza el parámetro de ruta", async () => {
    await renderWithClient(<FinanceHomeScreen />);
    await screen.findByText("Ganancia por ventas");
    fireEvent.press(screen.getByTestId("period-today"));
    expect(mockSetParams).toHaveBeenCalledWith({ period: "today" });
  });
});
