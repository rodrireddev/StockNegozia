import { describe, expect, it } from "vitest";
import {
  describeMovementActor,
  describeMovementReference,
  formatMovementUnitValue,
  formatSignedQuantity,
} from "./movement-labels";

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

describe("formatMovementUnitValue", () => {
  it("muestra '—' cuando el movimiento no tiene precio de operación (ADJUSTMENT)", () => {
    expect(formatMovementUnitValue(null)).toBe("—");
  });

  it("nunca muestra '$0' para un movimiento sin precio", () => {
    expect(formatMovementUnitValue(null)).not.toMatch(/\$\s*0/);
  });

  it("formatea un valor histórico como moneda", () => {
    // Comparación normalizando espacios: `Intl.NumberFormat` puede usar un espacio no separable
    // (U+00A0) entre "$" y el monto según el entorno — el texto renderizado (ver
    // InventoryMovementsPage.spec.tsx en Desktop) es lo que importa, no el carácter exacto acá.
    expect(formatMovementUnitValue(850).replace(/\s/g, " ")).toBe("$ 850,00");
  });
});

describe("describeMovementActor", () => {
  it("combina nombre y tipo del dispositivo cuando ambos están presentes", () => {
    const actor = describeMovementActor({ deviceName: "Electron Desktop", deviceType: "desktop" });
    expect(actor).toBe("Electron Desktop (Escritorio)");
  });

  it("usa solo el nombre si no hay tipo de dispositivo", () => {
    const actor = describeMovementActor({ deviceName: "Juan Android", deviceType: null });
    expect(actor).toBe("Juan Android");
  });

  it("devuelve null cuando no hay dispositivo asociado (sin inventar un actor)", () => {
    const actor = describeMovementActor({ deviceName: null, deviceType: null });
    expect(actor).toBeNull();
  });
});
