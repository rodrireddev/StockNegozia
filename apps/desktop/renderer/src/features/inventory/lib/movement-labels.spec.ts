import { describe, expect, it } from "vitest";
import { describeMovementReference, formatSignedQuantity } from "./movement-labels";

describe("formatSignedQuantity", () => {
  it("antepone + a una entrada (IN)", () => {
    expect(formatSignedQuantity({ direction: "IN", quantity: 10 })).toBe("+10");
  });

  it("antepone - a una salida (OUT)", () => {
    expect(formatSignedQuantity({ direction: "OUT", quantity: 2 })).toBe("-2");
  });
});

describe("describeMovementReference", () => {
  it("referencia la venta cuando saleId está presente", () => {
    const ref = describeMovementReference({ saleId: 7, purchaseId: null, reason: null });
    expect(ref).toBe("Venta #7");
  });

  it("referencia la compra cuando purchaseId está presente", () => {
    const ref = describeMovementReference({ saleId: null, purchaseId: 12, reason: null });
    expect(ref).toBe("Compra #12");
  });

  it("usa el motivo cuando no hay venta ni compra asociada (ajuste manual)", () => {
    const ref = describeMovementReference({
      saleId: null,
      purchaseId: null,
      reason: "Conteo físico",
    });
    expect(ref).toBe("Conteo físico");
  });

  it("devuelve null cuando no hay venta, compra ni motivo", () => {
    const ref = describeMovementReference({ saleId: null, purchaseId: null, reason: null });
    expect(ref).toBeNull();
  });
});
