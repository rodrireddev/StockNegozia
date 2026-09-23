// `ledger.ts` importa (transitivamente) `@/database/client`, que abre la base SQLite real al
// cargarse — acá sólo se ejercitan las funciones puras de agregación, sin tocar ninguna base.
jest.mock("@/database/client", () => ({ db: {} }));

import { ledgerEntryProfit, sumDailyProfits, sumLedgerEntries, type ProfitLedgerEntry } from "./ledger";

function saleEntry(overrides: Partial<ProfitLedgerEntry> & { id: number }): ProfitLedgerEntry {
  return {
    kind: "sale",
    saleId: overrides.id,
    productId: 1,
    productName: "Producto",
    quantity: 1,
    unitPrice: 100,
    unitCost: 60,
    revenue: 100,
    cost: 60,
    profit: 40,
    createdAt: "2026-01-01T12:00:00.000Z",
    ...overrides,
  } as ProfitLedgerEntry;
}

function cashAdjustmentEntry(
  overrides: Partial<ProfitLedgerEntry> & { id: number; direction: "IN" | "OUT" },
): ProfitLedgerEntry {
  return {
    kind: "cashAdjustment",
    amount: 50,
    reason: "Pago sueldo",
    createdAt: "2026-01-01T12:00:00.000Z",
    ...overrides,
  } as ProfitLedgerEntry;
}

describe("ledgerEntryProfit", () => {
  it("para una venta, es directamente su margen", () => {
    expect(ledgerEntryProfit(saleEntry({ id: 1, profit: 40 }))).toBe(40);
  });

  it("un retiro de caja (OUT) resta", () => {
    expect(ledgerEntryProfit(cashAdjustmentEntry({ id: 1, direction: "OUT", amount: 30 }))).toBe(-30);
  });

  it("un ingreso de caja (IN) suma", () => {
    expect(ledgerEntryProfit(cashAdjustmentEntry({ id: 1, direction: "IN", amount: 30 }))).toBe(30);
  });
});

describe("sumLedgerEntries", () => {
  it("revenue/cost sólo suman ventas — un ajuste de caja nunca los toca", () => {
    const entries = [
      saleEntry({ id: 1, revenue: 100, cost: 60, profit: 40 }),
      cashAdjustmentEntry({ id: 2, direction: "OUT", amount: 30 }),
    ];
    const totals = sumLedgerEntries(entries);
    expect(totals.revenue).toBe(100);
    expect(totals.cost).toBe(60);
  });

  it("profit combina el margen de las ventas con el signo de los ajustes de caja", () => {
    const entries = [
      saleEntry({ id: 1, profit: 40 }),
      cashAdjustmentEntry({ id: 2, direction: "OUT", amount: 30 }),
      cashAdjustmentEntry({ id: 3, direction: "IN", amount: 10 }),
    ];
    const totals = sumLedgerEntries(entries);
    // 40 (venta) - 30 (retiro) + 10 (ingreso) = 20
    expect(totals.profit).toBe(20);
  });

  it("un retiro más grande que la ganancia de venta puede dejar el total en negativo", () => {
    const entries = [saleEntry({ id: 1, profit: 40 }), cashAdjustmentEntry({ id: 2, direction: "OUT", amount: 100 })];
    expect(sumLedgerEntries(entries).profit).toBe(-60);
  });
});

describe("sumDailyProfits", () => {
  it("suma revenue/cost/profit de varios días ya agregados", () => {
    const days = [
      { date: "2026-01-01", label: "Jue", revenue: 100, cost: 60, profit: 40 },
      { date: "2026-01-02", label: "Vie", revenue: 0, cost: 0, profit: -30 },
    ];
    expect(sumDailyProfits(days)).toEqual({ revenue: 100, cost: 60, profit: 10 });
  });
});
