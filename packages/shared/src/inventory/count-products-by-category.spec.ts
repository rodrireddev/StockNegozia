import type { CategoryDto, ProductDto } from "@stocknegozia/api-contracts";
import { describe, expect, it } from "vitest";
import { countProductsByCategory } from "./count-products-by-category";

function makeProduct(overrides: Partial<ProductDto> & { id: number }): ProductDto {
  return {
    name: "Producto",
    sku: `SKU-${overrides.id}`,
    barcode: null,
    description: null,
    categoryId: null,
    categoryName: null,
    purchasePrice: 0,
    salePrice: 0,
    stock: 0,
    minimumStock: 0,
    stockStatus: "normal",
    image: null,
    active: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const bebidas: CategoryDto = { id: 1, name: "Bebidas" };
const almacen: CategoryDto = { id: 2, name: "Almacén" };

describe("countProductsByCategory", () => {
  it("cuenta los productos de cada categoría", () => {
    const products = [
      makeProduct({ id: 1, categoryId: 1, categoryName: "Bebidas" }),
      makeProduct({ id: 2, categoryId: 1, categoryName: "Bebidas" }),
      makeProduct({ id: 3, categoryId: 2, categoryName: "Almacén" }),
    ];

    const result = countProductsByCategory([bebidas, almacen], products);

    expect(result).toContainEqual({ id: 1, name: "Bebidas", productCount: 2 });
    expect(result).toContainEqual({ id: 2, name: "Almacén", productCount: 1 });
  });

  it("incluye categorías sin ningún producto todavía, con conteo 0", () => {
    const result = countProductsByCategory([bebidas, almacen], []);

    expect(result).toContainEqual({ id: 1, name: "Bebidas", productCount: 0 });
    expect(result).toContainEqual({ id: 2, name: "Almacén", productCount: 0 });
  });

  it("agrupa los productos sin categoría bajo 'Sin categoría'", () => {
    const products = [makeProduct({ id: 1, categoryId: null })];

    const result = countProductsByCategory([bebidas], products);

    expect(result).toContainEqual({ id: null, name: "Sin categoría", productCount: 1 });
  });

  it("no agrega la fila 'Sin categoría' si todos los productos tienen categoría", () => {
    const products = [makeProduct({ id: 1, categoryId: 1, categoryName: "Bebidas" })];

    const result = countProductsByCategory([bebidas], products);

    expect(result.find((c) => c.id === null)).toBeUndefined();
  });

  it("ordena alfabéticamente por nombre", () => {
    const result = countProductsByCategory([bebidas, almacen], []);
    expect(result.map((c) => c.name)).toEqual(["Almacén", "Bebidas"]);
  });
});
