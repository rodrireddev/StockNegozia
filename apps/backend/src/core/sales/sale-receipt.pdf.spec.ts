import { describe, expect, it } from "vitest";
import { renderSaleReceiptPdf } from "./sale-receipt.pdf";

describe("renderSaleReceiptPdf", () => {
  it("genera un buffer PDF válido con los datos de la venta", async () => {
    const buffer = await renderSaleReceiptPdf(
      { id: 42, total: 15000, createdAt: new Date("2026-01-15T10:30:00Z"), status: "completed" },
      [
        {
          productName: "Producto A",
          productSku: "SKU-A",
          quantity: 2,
          unitPrice: 5000,
          subtotal: 10000,
        },
        {
          productName: "Producto B",
          productSku: "SKU-B",
          quantity: 1,
          unitPrice: 5000,
          subtotal: 5000,
        },
      ],
    );

    expect(buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(500);
  });

  it("genera un PDF incluso sin items", async () => {
    const buffer = await renderSaleReceiptPdf(
      { id: 1, total: 0, createdAt: new Date(), status: "completed" },
      [],
    );

    expect(buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });

  it("usa el ancho de ticket térmico (~100mm) en vez de una página A4", async () => {
    const buffer = await renderSaleReceiptPdf(
      { id: 1, total: 0, createdAt: new Date(), status: "completed" },
      [],
    );

    // El MediaBox de la página va sin comprimir en el PDF (a diferencia del contenido de texto),
    // así que se puede verificar el ancho directamente sobre los bytes crudos.
    const match = buffer.toString("latin1").match(/\/MediaBox \[0 0 ([\d.]+) [\d.]+\]/);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBeCloseTo(100 * 2.83465, 0);
  });

  it("sigue generando un PDF válido con nombres de producto largos (envueltos a más de una línea)", async () => {
    const buffer = await renderSaleReceiptPdf(
      { id: 7, total: 30000, createdAt: new Date(), status: "completed" },
      [
        {
          productName: "Combo familiar de gaseosas surtidas 2.25L pack x6 unidades importado",
          productSku: "SKU-LARGO",
          quantity: 1,
          unitPrice: 30000,
          subtotal: 30000,
        },
      ],
    );

    expect(buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });

  it("acepta un nombre de negocio personalizado en vez del default", async () => {
    const buffer = await renderSaleReceiptPdf(
      { id: 1, total: 0, createdAt: new Date(), status: "completed" },
      [],
      "Almacén Doña Rosa",
    );

    expect(buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });
});
