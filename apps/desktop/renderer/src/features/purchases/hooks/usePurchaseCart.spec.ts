import { describe, expect, it } from "vitest";
import {
  initialPurchaseCartState,
  purchaseCartReducer,
  selectPurchaseCartTotal,
  type PurchaseCartState,
} from "./usePurchaseCart";

const cocaCola = { id: 1, name: "Coca-Cola 2L", sku: "0012", purchasePrice: 900 };
const jabon = { id: 2, name: "Jabón en polvo", sku: "0045", purchasePrice: 1200 };

describe("purchaseCartReducer", () => {
  it("agrega un producto nuevo con cantidad 1 y el costo de compra como costo unitario inicial", () => {
    const state = purchaseCartReducer(initialPurchaseCartState, { type: "add", product: cocaCola });

    expect(state.items).toHaveLength(1);
    expect(state.items[0]!).toMatchObject({
      productId: cocaCola.id,
      quantity: 1,
      unitCost: cocaCola.purchasePrice,
    });
  });

  it("agregar el mismo producto dos veces incrementa la cantidad en vez de duplicar la línea", () => {
    let state = purchaseCartReducer(initialPurchaseCartState, { type: "add", product: cocaCola });
    state = purchaseCartReducer(state, { type: "add", product: cocaCola });

    expect(state.items).toHaveLength(1);
    expect(state.items[0]!.quantity).toBe(2);
  });

  it("modifica la cantidad de una línea existente", () => {
    let state = purchaseCartReducer(initialPurchaseCartState, { type: "add", product: cocaCola });
    state = purchaseCartReducer(state, { type: "setQuantity", productId: cocaCola.id, quantity: 10 });

    expect(state.items[0]!.quantity).toBe(10);
  });

  it("ignora una cantidad inválida (0, negativa o no entera)", () => {
    const state = purchaseCartReducer(initialPurchaseCartState, { type: "add", product: cocaCola });
    const withQuantityTen = purchaseCartReducer(state, {
      type: "setQuantity",
      productId: cocaCola.id,
      quantity: 10,
    });

    const zero = purchaseCartReducer(withQuantityTen, {
      type: "setQuantity",
      productId: cocaCola.id,
      quantity: 0,
    });
    expect(zero.items[0]!.quantity).toBe(10);

    const fraction = purchaseCartReducer(withQuantityTen, {
      type: "setQuantity",
      productId: cocaCola.id,
      quantity: 1.5,
    });
    expect(fraction.items[0]!.quantity).toBe(10);
  });

  it("modifica el costo unitario de una línea existente", () => {
    let state = purchaseCartReducer(initialPurchaseCartState, { type: "add", product: cocaCola });
    state = purchaseCartReducer(state, { type: "setUnitCost", productId: cocaCola.id, unitCost: 950 });

    expect(state.items[0]!.unitCost).toBe(950);
  });

  it("ignora un costo unitario inválido (negativo o no finito)", () => {
    let state = purchaseCartReducer(initialPurchaseCartState, { type: "add", product: cocaCola });
    state = purchaseCartReducer(state, { type: "setUnitCost", productId: cocaCola.id, unitCost: -5 });

    expect(state.items[0]!.unitCost).toBe(cocaCola.purchasePrice);
  });

  it("elimina una línea del carrito sin afectar las demás", () => {
    let state = purchaseCartReducer(initialPurchaseCartState, { type: "add", product: cocaCola });
    state = purchaseCartReducer(state, { type: "add", product: jabon });
    state = purchaseCartReducer(state, { type: "remove", productId: cocaCola.id });

    expect(state.items).toHaveLength(1);
    expect(state.items[0]!.productId).toBe(jabon.id);
  });

  it("vacía el carrito completo", () => {
    let state = purchaseCartReducer(initialPurchaseCartState, { type: "add", product: cocaCola });
    state = purchaseCartReducer(state, { type: "clear" });

    expect(state.items).toHaveLength(0);
  });

  it("calcula el subtotal por línea y el total como la suma de cantidad × costo unitario", () => {
    let state: PurchaseCartState = purchaseCartReducer(initialPurchaseCartState, {
      type: "add",
      product: cocaCola,
    });
    state = purchaseCartReducer(state, { type: "setQuantity", productId: cocaCola.id, quantity: 10 });
    state = purchaseCartReducer(state, { type: "setUnitCost", productId: cocaCola.id, unitCost: 500 });
    state = purchaseCartReducer(state, { type: "add", product: jabon }); // 1200 x1

    expect(selectPurchaseCartTotal(state)).toBe(10 * 500 + 1200 * 1);
  });
});
