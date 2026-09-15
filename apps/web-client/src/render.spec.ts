import type { ProductDto } from "@stocknegozia/api-contracts";
import { describe, expect, it } from "vitest";
import { formatConnectedStatus, formatDisconnectedStatus, formatProductsList } from "./render";

function product(overrides: Partial<ProductDto>): ProductDto {
  return {
    id: 1,
    name: "Producto A",
    sku: "SKU-1",
    barcode: null,
    description: null,
    categoryId: null,
    categoryName: null,
    purchasePrice: 100,
    salePrice: 150,
    stock: 10,
    minimumStock: 1,
    stockStatus: "normal",
    image: null,
    active: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("formatProductsList", () => {
  it("formatea cada producto como 'id — nombre'", () => {
    const products = [
      product({ id: 1, name: "Producto A" }),
      product({ id: 2, name: "Producto B" }),
    ];
    expect(formatProductsList(products)).toEqual(["1 — Producto A", "2 — Producto B"]);
  });

  it("devuelve una lista vacía si no hay productos", () => {
    expect(formatProductsList([])).toEqual([]);
  });
});

describe("formatConnectedStatus / formatDisconnectedStatus", () => {
  it("connected muestra el punto lleno y la clase correcta", () => {
    expect(formatConnectedStatus()).toEqual({ text: "● Connected", className: "status connected" });
  });

  it("disconnected muestra el punto vacío sin mensaje adicional", () => {
    expect(formatDisconnectedStatus()).toEqual({
      text: "○ Disconnected",
      className: "status disconnected",
    });
  });

  it("disconnected agrega el mensaje cuando se provee", () => {
    expect(formatDisconnectedStatus("timeout")).toEqual({
      text: "○ Disconnected — timeout",
      className: "status disconnected",
    });
  });
});
