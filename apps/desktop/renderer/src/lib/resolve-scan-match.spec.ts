import type { ProductDto } from "@stocknegozia/api-contracts";
import { describe, expect, it } from "vitest";
import { resolveScanMatch } from "./resolve-scan-match";

function makeProduct(overrides: Partial<ProductDto> & { id: number }): ProductDto {
  return {
    name: "Producto",
    sku: `SKU-${overrides.id}`,
    barcode: null,
    description: null,
    categoryId: null,
    categoryName: null,
    purchasePrice: 0,
    salePrice: 100,
    stock: 5,
    minimumStock: 0,
    stockStatus: "normal",
    image: null,
    active: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("resolveScanMatch", () => {
  it("no agrega nada si la búsqueda está vacía", () => {
    expect(resolveScanMatch([makeProduct({ id: 1 })], "   ")).toBeUndefined();
  });

  it("no agrega nada si no hay resultados", () => {
    expect(resolveScanMatch([], "0012")).toBeUndefined();
  });

  it("agrega el único resultado disponible aunque el texto no coincida exacto", () => {
    const product = makeProduct({ id: 1, name: "Fideos 500g" });
    expect(resolveScanMatch([product], "fide")).toBe(product);
  });

  it("con varios resultados, agrega el que coincide exacto por SKU", () => {
    const a = makeProduct({ id: 1, sku: "0012" });
    const b = makeProduct({ id: 2, sku: "0045" });
    expect(resolveScanMatch([a, b], "0045")).toBe(b);
  });

  it("con varios resultados, agrega el que coincide exacto por código de barras", () => {
    const a = makeProduct({ id: 1, sku: "0012", barcode: "7791234567890" });
    const b = makeProduct({ id: 2, sku: "0045", barcode: null });
    expect(resolveScanMatch([a, b], "7791234567890")).toBe(a);
  });

  it("con varios resultados y ninguna coincidencia exacta, no agrega nada (evita ambigüedad)", () => {
    const a = makeProduct({ id: 1, name: "Coca-Cola 2L", sku: "0012" });
    const b = makeProduct({ id: 2, name: "Coca-Cola 1.5L", sku: "0013" });
    expect(resolveScanMatch([a, b], "coca")).toBeUndefined();
  });
});
