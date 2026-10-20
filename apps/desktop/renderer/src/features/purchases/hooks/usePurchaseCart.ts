import { useReducer } from "react";
import {
  initialPurchaseCartState,
  purchaseCartReducer,
  selectPurchaseCartTotal,
  type PurchaseCartProduct,
} from "@stocknegozia/shared";

export type { PurchaseCartAction, PurchaseCartItem, PurchaseCartState } from "@stocknegozia/shared";

/**
 * Mismo patrón que `useCart` de Ventas (M10), pero independiente: una compra no tiene el
 * concepto de "stock disponible" (siempre está sumando stock, nunca lo consume) y en cambio
 * necesita `unitCost` editable por línea, algo que Ventas no maneja. Reducer compartido con
 * Mobile, ver `@stocknegozia/shared`.
 */
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
