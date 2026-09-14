import { createPurchaseSchema } from "@stocknegozia/validation";
import { describe, expect, it } from "vitest";

describe("createPurchaseSchema", () => {
  it("acepta un payload válido", () => {
    const result = createPurchaseSchema.safeParse({
      supplierId: 1,
      items: [{ productId: 1, quantity: 2, unitCost: 500 }],
    });
    expect(result.success).toBe(true);
  });

  it("acepta varios ítems", () => {
    const result = createPurchaseSchema.safeParse({
      supplierId: 1,
      items: [
        { productId: 1, quantity: 2, unitCost: 500 },
        { productId: 2, quantity: 1, unitCost: 1200 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("acepta unitCost = 0", () => {
    const result = createPurchaseSchema.safeParse({
      supplierId: 1,
      items: [{ productId: 1, quantity: 1, unitCost: 0 }],
    });
    expect(result.success).toBe(true);
  });

  it("rechaza supplierId ausente", () => {
    const result = createPurchaseSchema.safeParse({
      items: [{ productId: 1, quantity: 1, unitCost: 100 }],
    });
    expect(result.success).toBe(false);
  });

  it("rechaza quantity = 0", () => {
    const result = createPurchaseSchema.safeParse({
      supplierId: 1,
      items: [{ productId: 1, quantity: 0, unitCost: 100 }],
    });
    expect(result.success).toBe(false);
  });

  it("rechaza quantity negativa", () => {
    const result = createPurchaseSchema.safeParse({
      supplierId: 1,
      items: [{ productId: 1, quantity: -1, unitCost: 100 }],
    });
    expect(result.success).toBe(false);
  });

  it("rechaza quantity no entera", () => {
    const result = createPurchaseSchema.safeParse({
      supplierId: 1,
      items: [{ productId: 1, quantity: 1.5, unitCost: 100 }],
    });
    expect(result.success).toBe(false);
  });

  it("rechaza unitCost negativo", () => {
    const result = createPurchaseSchema.safeParse({
      supplierId: 1,
      items: [{ productId: 1, quantity: 1, unitCost: -1 }],
    });
    expect(result.success).toBe(false);
  });

  it("rechaza unitCost infinito", () => {
    const result = createPurchaseSchema.safeParse({
      supplierId: 1,
      items: [{ productId: 1, quantity: 1, unitCost: Number.POSITIVE_INFINITY }],
    });
    expect(result.success).toBe(false);
  });

  it("rechaza items vacío", () => {
    const result = createPurchaseSchema.safeParse({ supplierId: 1, items: [] });
    expect(result.success).toBe(false);
  });

  it("rechaza productId repetido dentro de la misma compra", () => {
    const result = createPurchaseSchema.safeParse({
      supplierId: 1,
      items: [
        { productId: 1, quantity: 2, unitCost: 100 },
        { productId: 1, quantity: 3, unitCost: 100 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("ignora un total enviado por el cliente — no forma parte del contrato", () => {
    const result = createPurchaseSchema.safeParse({
      supplierId: 1,
      total: 999_999,
      items: [{ productId: 1, quantity: 1, unitCost: 100 }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("total");
    }
  });

  it("rechaza un payload completamente inválido", () => {
    const result = createPurchaseSchema.safeParse({ foo: "bar" });
    expect(result.success).toBe(false);
  });
});
