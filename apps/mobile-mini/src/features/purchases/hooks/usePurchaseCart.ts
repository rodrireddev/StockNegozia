import { useReducer } from "react";
import {
  initialPurchaseCartState,
  purchaseCartReducer,
  selectPurchaseCartTotal,
  type PurchaseCartProduct,
} from "@stocknegozia/shared";

export type { PurchaseCartAction, PurchaseCartItem, PurchaseCartState } from "@stocknegozia/shared";

/** Reducer compartido con Desktop, ver `@stocknegozia/shared` — a diferencia de Ventas, una
 *  compra necesita `unitCost` editable por línea (no tiene concepto de stock disponible). */
export function usePurchaseCart() {
  const [state, dispatch] = useReducer(purchaseCartReducer, initialPurchaseCartState);

  return {
    items: state.items,
    total: selectPurchaseCartTotal(state),
    isEmpty: state.items.length === 0,
    addItem: (product: PurchaseCartProduct) => dispatch({ type: "add", product }),
    setQuantity: (productId: number, quantity: number) =>
      dispatch({ type: "setQuantity", productId, quantity }),
    setUnitCost: (productId: number, unitCost: number) =>
      dispatch({ type: "setUnitCost", productId, unitCost }),
    removeItem: (productId: number) => dispatch({ type: "remove", productId }),
    clear: () => dispatch({ type: "clear" }),
  };
}
