import { describe, expect, it } from "vitest";
import {
  changePaymentLineMethod,
  createPaymentDraft,
  describePayment,
  describePaymentMethods,
  disableSplitPayment,
  enableSplitPayment,
  fillRemaining,
  summarizePaymentDraft,
} from "./payments";

describe("summarizePaymentDraft — un único pago", () => {
  it("transferencia: no envía monto (lo calcula el backend)", () => {
    const draft = createPaymentDraft("transfer");
    const summary = summarizePaymentDraft(draft, 100_000_000);
    expect(summary.error).toBeNull();
    expect(summary.payments).toEqual([{ method: "transfer" }]);
  });

  it("efectivo con 'paga con' calcula el vuelto", () => {
    const draft = createPaymentDraft("cash");
    draft.lines[0]!.receivedText = "100.000.000";
    const summary = summarizePaymentDraft(draft, 99_500_000);
    expect(summary.change).toBe(500_000);
    expect(summary.payments).toEqual([{ method: "cash", amountReceived: 100_000_000 }]);
  });

  it("efectivo con monto recibido menor al total es un error", () => {
    const draft = createPaymentDraft("cash");
    draft.lines[0]!.receivedText = "500";
    expect(summarizePaymentDraft(draft, 1000).error).toMatch(/menor al total/);
  });

  it("crédito envía cuotas, marca y referencia", () => {
    const draft = createPaymentDraft("credit_card");
    draft.lines[0] = {
      ...draft.lines[0]!,
      installments: 6,
      cardBrand: "visa",
      reference: " 0042 ",
    };
    expect(summarizePaymentDraft(draft, 6000).payments).toEqual([
      { method: "credit_card", installments: 6, cardBrand: "visa", reference: "0042" },
    ]);
  });
});

describe("summarizePaymentDraft — pago mixto", () => {
  it("exige que la suma dé el total", () => {
    let draft = enableSplitPayment(createPaymentDraft("cash"), 10_000);
    draft.lines[0]!.amountText = "4.000";
    draft.lines[1]!.amountText = "5.000";
    expect(summarizePaymentDraft(draft, 10_000).error).toMatch(/Faltan asignar/);

    draft = fillRemaining(draft, draft.lines[1]!.key, 10_000);
    const summary = summarizePaymentDraft(draft, 10_000);
    expect(summary.error).toBeNull();
    expect(summary.payments).toEqual([
      { method: "cash", amount: 4000 },
      { method: "credit_card", amount: 6000, installments: 1 },
    ]);
  });

  it("detecta cuando los pagos superan el total", () => {
    const draft = enableSplitPayment(createPaymentDraft("cash"), 1000);
    draft.lines[1]!.amountText = "1";
    expect(summarizePaymentDraft(draft, 1000).error).toMatch(/superan el total/);
  });

  it("volver a un pago conserva el medio", () => {
    const draft = disableSplitPayment(enableSplitPayment(createPaymentDraft("qr"), 1000));
    expect(draft.split).toBe(false);
    expect(draft.lines).toHaveLength(1);
    expect(draft.lines[0]!.method).toBe("qr");
  });
});

describe("helpers de descripción", () => {
  it("cambiar de medio limpia datos que no aplican", () => {
    const line = {
      ...createPaymentDraft("credit_card").lines[0]!,
      installments: 3,
      cardBrand: "visa" as const,
    };
    const cash = changePaymentLineMethod(line, "cash");
    expect(cash.installments).toBe(1);
    expect(cash.cardBrand).toBeNull();
  });

  it("describe pagos y medios", () => {
    expect(
      describePayment({
        method: "credit_card",
        amount: 3000,
        installments: 3,
        cardBrand: "visa",
        reference: null,
      }).replace(/\s/g, " "),
    ).toBe("Crédito Visa · 3 cuotas de $ 1.000,00");
    expect(describePaymentMethods([])).toBe("Sin especificar");
    expect(describePaymentMethods(["cash", "credit_card"])).toBe("Efectivo + Crédito");
  });
});
