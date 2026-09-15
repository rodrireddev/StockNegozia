import { describe, expect, it } from "vitest";
import { cartReducer, initialCartState, selectCartTotal, type CartState } from "./cart";

const cocaCola = { id: 1, name: "Coca-Cola 2L", sku: "0012", salePrice: 1200, stock: 10 };
const jabon = { id: 2, name: "Jabón en polvo", sku: "0045", salePrice: 1800, stock: 3 };

describe("cartReducer", () => {
  it("agrega un producto nuevo con cantidad 1", () => {
    const state = cartReducer(initialCartState, { type: "add", product: cocaCola });

    expect(state.items).toHaveLength(1);
    expect(state.items[0]!).toMatchObject({
      productId: cocaCola.id,
      name: cocaCola.name,
      sku: cocaCola.sku,
      unitPrice: cocaCola.salePrice,
      quantity: 1,
      availableStock: cocaCola.stock,
    });
  });

  it("agregar el mismo producto dos veces incrementa la cantidad en vez de duplicar la línea", () => {
    let state = cartReducer(initialCartState, { type: "add", product: cocaCola });
    state = cartReducer(state, { type: "add", product: cocaCola });

    expect(state.items).toHaveLength(1);
    expect(state.items[0]!.quantity).toBe(2);
  });

  it("incrementa la cantidad de una línea existente", () => {
    let state = cartReducer(initialCartState, { type: "add", product: cocaCola });
    state = cartReducer(state, { type: "increment", productId: cocaCola.id });

    expect(state.items[0]!.quantity).toBe(2);
  });

  it("disminuye la cantidad de una línea sin bajar de 1", () => {
    let state = cartReducer(initialCartState, { type: "add", product: cocaCola });
    state = cartReducer(state, { type: "increment", productId: cocaCola.id }); // 2

    state = cartReducer(state, { type: "decrement", productId: cocaCola.id });
    expect(state.items[0]!.quantity).toBe(1);

    // ya está en 1 — decrementar de nuevo no debe pisar en 0 ni desaparecer la línea
    state = cartReducer(state, { type: "decrement", productId: cocaCola.id });
    expect(state.items[0]!.quantity).toBe(1);
  });

  it("elimina una línea del carrito sin afectar las demás", () => {
    let state = cartReducer(initialCartState, { type: "add", product: cocaCola });
    state = cartReducer(state, { type: "add", product: jabon });

    state = cartReducer(state, { type: "remove", productId: cocaCola.id });

    expect(state.items).toHaveLength(1);
    expect(state.items[0]!.productId).toBe(jabon.id);
  });

  it("vacía el carrito completo", () => {
    let state = cartReducer(initialCartState, { type: "add", product: cocaCola });
    state = cartReducer(state, { type: "add", product: jabon });

    state = cartReducer(state, { type: "clear" });

    expect(state.items).toHaveLength(0);
  });

  it("calcula el total como la suma de cantidad × precio de cada línea", () => {
    let state: CartState = cartReducer(initialCartState, { type: "add", product: cocaCola }); // 1200 x1
    state = cartReducer(state, { type: "add", product: jabon }); // 1800 x1
    state = cartReducer(state, { type: "increment", productId: cocaCola.id }); // 1200 x2

    expect(selectCartTotal(state)).toBe(1200 * 2 + 1800 * 1);
  });

  it("el total de un carrito vacío es 0", () => {
    expect(selectCartTotal(initialCartState)).toBe(0);
  });
});
