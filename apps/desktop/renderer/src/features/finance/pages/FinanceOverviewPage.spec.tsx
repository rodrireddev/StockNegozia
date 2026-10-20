import type { FinanceSummaryDto } from "@stocknegozia/api-contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FinanceOverviewPage } from "./FinanceOverviewPage";

const { fetchFinanceSummaryMock } = vi.hoisted(() => ({ fetchFinanceSummaryMock: vi.fn() }));

vi.mock("../api/finance.api", () => ({
  fetchFinanceSummary: fetchFinanceSummaryMock,
}));

function makeSummary(overrides: Partial<FinanceSummaryDto> = {}): FinanceSummaryDto {
  return {
    from: "2026-10-01T03:00:00.000Z",
    to: "2026-10-08T02:59:59.999Z",
    granularity: "day",
    sales: {
      count: 3,
      revenue: 300_000_000,
      cost: 180_000_000,
      profit: 120_000_000,
      marginPercent: 40,
      averageTicket: 100_000_000,
      unitsSold: 3,
    },
    purchases: { count: 2, total: 50_000 },
    cash: { withdrawals: 70_000, withdrawalsCount: 2, deposits: 0, depositsCount: 0 },
    collections: { total: 300_000_000, surcharges: 0, fees: 0, net: 300_000_000, byMethod: [] },
    receivables: { soldOnAccount: 0, received: 0, outstanding: 0 },
    pendingSettlement: { amount: 100_000_000, count: 1, nextDate: "2026-10-12T03:00:00.000Z" },
    series: [
      {
        key: "2026-10-07",
        label: "Mié",
        revenue: 300_000_000,
        cost: 180_000_000,
        profit: 120_000_000,
        purchases: 50_000,
        withdrawals: 70_000,
      },
    ],
    ...overrides,
  };
}

function renderPage(initialPath = "/profits?period=week") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/profits" element={<FinanceOverviewPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const normalize = (text: string | null) => (text ?? "").replace(/\s/g, " ");

describe("FinanceOverviewPage", () => {
  beforeEach(() => {
    fetchFinanceSummaryMock.mockReset();
    fetchFinanceSummaryMock.mockResolvedValue(makeSummary());
  });

  it("muestra ventas, compras, retiros y cobros como tarjetas separadas que llevan a su vista", async () => {
    renderPage();
    const salesCard = (await screen.findByText("Ganancia por ventas")).closest("a")!;
    expect(normalize(salesCard.textContent)).toContain("$ 120.000.000,00");
    expect(salesCard.getAttribute("href")).toBe("/profits/sales?period=week");

    // El retiro de caja NO se resta de la ganancia: tiene su propia tarjeta.
    const cashCard = screen.getByText("Retiros de caja").closest("a")!;
    expect(normalize(cashCard.textContent)).toContain("$ 70.000,00");
    expect(
      within(screen.getByText("Gastos en mercadería").closest("a")!).getByText(/2 compras/),
    ).toBeInTheDocument();
    expect(normalize(screen.getByText("Cobrado").closest("a")!.textContent)).toContain(
      "Por acreditar",
    );
  });

  it("cambiar el período vuelve a pedir el resumen con otro rango", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Ganancia por ventas");
    await user.click(screen.getByRole("radio", { name: "Este mes" }));
    expect(fetchFinanceSummaryMock).toHaveBeenCalledTimes(2);
    const [{ from }] = fetchFinanceSummaryMock.mock.calls[1]!;
    expect((from as Date).getDate()).toBe(1);
  });
});
