import { createSaleSchema } from "@stocknegozia/validation";
import { describe, expect, it } from "vitest";

describe("createSaleSchema", () => {
  it("acepta un payload válido", () => {
    const result = createSaleSchema.safeParse({
      items: [{ productId: 1, quantity: 2 }],
    });
    expect(result.success).toBe(true);
  });

  it("acepta varios ítems", () => {
    const result = createSaleSchema.safeParse({
      items: [
        { productId: 1, quantity: 2 },
        { productId: 2, quantity: 1 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rechaza quantity = 0", () => {
    const result = createSaleSchema.safeParse({
      items: [{ productId: 1, quantity: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it("rechaza quantity negativa", () => {
    const result = createSaleSchema.safeParse({
      items: [{ productId: 1, quantity: -1 }],
    });
    expect(result.success).toBe(false);
  });

  it("rechaza quantity no entera", () => {
    const result = createSaleSchema.safeParse({
      items: [{ productId: 1, quantity: 1.5 }],
    });
    expect(result.success).toBe(false);
  });

  it("rechaza quantity = NaN", () => {
    const result = createSaleSchema.safeParse({
      items: [{ productId: 1, quantity: Number.NaN }],
    });
    expect(result.success).toBe(false);
  });

  it("rechaza quantity = Infinity", () => {
    const result = createSaleSchema.safeParse({
      items: [{ productId: 1, quantity: Number.POSITIVE_INFINITY }],
    });
    expect(result.success).toBe(false);
  });

  it("rechaza items vacío", () => {
    const result = createSaleSchema.safeParse({ items: [] });
    expect(result.success).toBe(false);
  });

  it("rechaza productId vacío/ausente", () => {
    const result = createSaleSchema.safeParse({
      items: [{ quantity: 1 }],
    });
    expect(result.success).toBe(false);
  });

  it("rechaza un payload completamente inválido", () => {
    const result = createSaleSchema.safeParse({ foo: "bar" });
    expect(result.success).toBe(false);
  });

  it("rechaza items que no es un array", () => {
    const result = createSaleSchema.safeParse({ items: "no-array" });
    expect(result.success).toBe(false);
  });
});
