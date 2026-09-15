import { useReducer } from "react";
import {
  cartReducer,
  initialCartState,
  selectCartTotal,
  type CartProduct,
} from "@stocknegozia/shared";

export type { CartAction, CartItem, CartState } from "@stocknegozia/shared";

/** Estado del carrito de la venta en curso — vive localmente en `SalesPage`, no hay razón todavía
 *  para un store global (ver `M10 — Decisiones`). Reducer compartido con Mobile, ver `@stocknegozia/shared`. */
export function useCart() {
  const [state, dispatch] = useReducer(cartReducer, initialCartState);

  return {
    items: state.items,
    total: selectCartTotal(state),
    isEmpty: state.items.length === 0,
    addItem: (product: CartProduct) => dispatch({ type: "add", product }),
    incrementItem: (productId: number) => dispatch({ type: "increment", productId }),
    decrementItem: (productId: number) => dispatch({ type: "decrement", productId }),
    removeItem: (productId: number) => dispatch({ type: "remove", productId }),
    clear: () => dispatch({ type: "clear" }),
  };
}
