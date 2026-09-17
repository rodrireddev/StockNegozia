import { buildReceiptHtml } from "./receipt";

describe("buildReceiptHtml", () => {
  it("incluye el número de venta, los productos y el total formateado", () => {
    const html = buildReceiptHtml(
      { id: 7, createdAt: "2026-01-15T10:30:00.000Z", total: 15000 },
      [
        { name: "Coca-Cola 2L", sku: "0012", quantity: 2, unitPrice: 5000, subtotal: 10000 },
        { name: "Jabón en polvo", sku: "0045", quantity: 1, unitPrice: 5000, subtotal: 5000 },
      ],
      "StockNegozia",
    );

    expect(html).toContain("Venta Nº 7");
    expect(html).toContain("Coca-Cola 2L");
    expect(html).toContain("Jabón en polvo");
    expect(html).toContain("Documento no válido como factura");
    expect(html).toMatch(/\$\s?15[.,]?000/);
  });

  it("genera HTML válido incluso sin items", () => {
    const html = buildReceiptHtml(
      { id: 1, createdAt: "2026-01-01T00:00:00.000Z", total: 0 },
      [],
      "StockNegozia",
    );

    expect(html).toContain("<html>");
    expect(html).toContain("Venta Nº 1");
  });

  it("usa el nombre del negocio configurado en vez de 'StockNegozia'", () => {
    const html = buildReceiptHtml(
      { id: 1, createdAt: "2026-01-01T00:00:00.000Z", total: 0 },
      [],
      "Almacén Doña Rosa",
    );

    expect(html).toContain("Almacén Doña Rosa");
    expect(html).not.toContain("StockNegozia");
  });
});
