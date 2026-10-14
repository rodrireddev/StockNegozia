import type { PaymentTermsDto } from "@stocknegozia/api-contracts";
import { describe, expect, it } from "vitest";
import {
  addSettlementDays,
  computePaymentCharges,
  DEFAULT_PAYMENT_TERMS,
  resolvePlanTerms,
} from "../sales/payment-terms";
import { createPaymentDraft, summarizePaymentDraft } from "../sales/payments";
import { resolveFinancePeriod } from "./period";
import {
  buildFinanceSummary,
  buildSettlements,
  buildTopProducts,
  groupCashByReason,
  type FinancePaymentRow,
} from "./summary";

const terms: PaymentTermsDto = {
  ...DEFAULT_PAYMENT_TERMS,
  debit: { surchargePercent: 0, feePercent: 1, settlementDays: 1 },
  credit: [
    { installments: 1, surchargePercent: 0, feePercent: 3, settlementDays: 10 },
    { installments: 6, surchargePercent: 15, feePercent: 3, settlementDays: 2 },
  ],
};

// Viernes 2 de octubre de 2026, 10hs.
const friday = new Date(2026, 9, 2, 10, 0, 0);

describe("condiciones de cobro", () => {
  it("días hábiles saltean fines de semana", () => {
    expect(addSettlementDays(friday, 1, true).getDate()).toBe(5); // lunes
    expect(addSettlementDays(friday, 1, false).getDate()).toBe(3); // sábado
    expect(addSettlementDays(friday, 0, true).getTime()).toBe(friday.getTime());
  });

  it("crédito en 6 cuotas: recargo al cliente, comisión sobre lo cobrado y acreditación", () => {
    const charges = computePaymentCharges(
      { method: "credit_card", amount: 100_000_000, installments: 6 },
      terms,
      friday,
    );
    expect(charges.surchargeAmount).toBe(15_000_000);
    expect(charges.chargedAmount).toBe(115_000_000);
    expect(charges.feeAmount).toBe(3_450_000);
    expect(charges.netAmount).toBe(111_550_000);
    expect(charges.settlementDate?.getDate()).toBe(6); // martes
  });

  it("bonificar el recargo deja la comisión", () => {
    const charges = computePaymentCharges(
      { method: "credit_card", amount: 1000, installments: 6, waiveSurcharge: true },
      terms,
      friday,
    );
    expect(charges.surchargeAmount).toBe(0);
    expect(charges.feeAmount).toBe(30);
  });

  it("efectivo no tiene recargo ni acreditación diferida", () => {
    const charges = computePaymentCharges({ method: "cash", amount: 500 }, terms, friday);
    expect(charges).toMatchObject({ surchargeAmount: 0, feeAmount: 0, settlementDate: null });
  });

  it("un plan de cuotas no configurado nunca cobra recargo", () => {
    expect(resolvePlanTerms(terms, "credit_card", 12)?.surchargePercent).toBe(0);
  });

  it("el borrador de pago suma el recargo al total a cobrar", () => {
    const draft = createPaymentDraft("credit_card");
    draft.lines[0]!.installments = 6;
    const summary = summarizePaymentDraft(draft, 10_000, terms, friday);
    expect(summary.surcharge).toBe(1_500);
    expect(summary.totalToCharge).toBe(11_500);
    expect(summary.payments).toEqual([{ method: "credit_card", installments: 6 }]);
  });
});

describe("períodos", () => {
  it("mes anterior va del 1 al último día", () => {
    const period = resolveFinancePeriod("lastMonth", friday);
    expect(period.from).toEqual(new Date(2026, 8, 1));
    expect(period.to.getDate()).toBe(30);
    expect(period.label).toBe("Septiembre de 2026");
  });

  it("7 días incluye hoy", () => {
    const period = resolveFinancePeriod("week", friday);
    expect(period.from.getDate()).toBe(26);
  });
});

function payment(overrides: Partial<FinancePaymentRow>): FinancePaymentRow {
  return {
    paymentId: 1,
    saleId: 1,
    saleTotal: 1000,
    method: "cash",
    amount: 1000,
    surchargeAmount: 0,
    feeAmount: 0,
    cardBrand: null,
    installments: null,
    settlementDate: null,
    createdAt: friday,
    ...overrides,
  };
}

describe("resumen de finanzas", () => {
  it("separa ventas, compras, caja y cobros", () => {
    const { from, to } = resolveFinancePeriod("today", friday);
    const pendingCard = payment({
      paymentId: 2,
      saleId: 2,
      method: "credit_card",
      amount: 2000,
      surchargeAmount: 300,
      feeAmount: 69,
      settlementDate: new Date(2026, 9, 6),
    });
    const summary = buildFinanceSummary({
      from,
      to,
      now: friday,
      saleLines: [
        {
          saleId: 1,
          productId: 1,
          productName: "A",
          quantity: 1,
          revenue: 1000,
          cost: 600,
          createdAt: friday,
        },
        {
          saleId: 2,
          productId: 2,
          productName: "B",
          quantity: 2,
          revenue: 2000,
          cost: 1000,
          createdAt: friday,
        },
      ],
      payments: [payment({}), pendingCard],
      purchases: [{ total: 5000, createdAt: friday }],
      cashAdjustments: [
        { direction: "OUT", amount: 700, reason: "Sueldo", createdAt: friday },
        { direction: "IN", amount: 100, reason: "Aporte", createdAt: friday },
      ],
      pendingPayments: [pendingCard],
    });

    expect(summary.granularity).toBe("hour");
    expect(summary.sales).toMatchObject({
      count: 2,
      revenue: 3000,
      cost: 1600,
      profit: 1400,
      unitsSold: 3,
    });
    expect(summary.sales.marginPercent).toBe(46.7);
    // Los retiros NO se restan de la ganancia, ni las compras.
    expect(summary.purchases.total).toBe(5000);
    expect(summary.cash).toMatchObject({ withdrawals: 700, deposits: 100 });
    expect(summary.collections).toMatchObject({
      total: 3300,
      surcharges: 300,
      fees: 69,
      net: 3231,
    });
    expect(summary.pendingSettlement).toMatchObject({ amount: 2231, count: 1 });
    expect(summary.series).toHaveLength(24);
    expect(summary.series[10]).toMatchObject({ profit: 1400, purchases: 5000, withdrawals: 700 });
  });

  it("acreditaciones: pendientes y acreditadas según la fecha", () => {
    const rows = [
      payment({ paymentId: 1, method: "debit_card", settlementDate: new Date(2026, 9, 1) }),
      payment({ paymentId: 2, method: "credit_card", settlementDate: new Date(2026, 9, 20) }),
      payment({ paymentId: 3, method: "cash" }),
    ];
    expect(buildSettlements(rows, friday, "pending").map((item) => item.paymentId)).toEqual([2]);
    expect(buildSettlements(rows, friday, "settled").map((item) => item.paymentId)).toEqual([1]);
  });

  it("top productos por ganancia y caja agrupada por motivo", () => {
    expect(
      buildTopProducts([
        {
          saleId: 1,
          productId: 1,
          productName: "A",
          quantity: 1,
          revenue: 100,
          cost: 90,
          createdAt: friday,
        },
        {
          saleId: 2,
          productId: 2,
          productName: "B",
          quantity: 1,
          revenue: 100,
          cost: 10,
          createdAt: friday,
        },
      ]).map((product) => product.productName),
    ).toEqual(["B", "A"]);
    expect(
      groupCashByReason([
        { direction: "OUT", amount: 100, reason: "Pago sueldo", createdAt: friday },
        { direction: "OUT", amount: 50, reason: " pago  SUELDO ", createdAt: friday },
        { direction: "OUT", amount: 500, reason: "Alquiler", createdAt: friday },
      ]),
    ).toEqual([
      { direction: "OUT", reason: "Alquiler", total: 500, count: 1 },
      { direction: "OUT", reason: "Pago sueldo", total: 150, count: 2 },
    ]);
  });
});
