import type { ProductDto } from "@stocknegozia/api-contracts";
import { useReducer } from "react";

export interface CartItem {
  productId: number;
  name: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  /** Stock disponible según la última vez que se cargó este producto — informativo, no
   *  autoritativo (ver `SaleCartPanel`). El backend es quien valida el stock real al confirmar. */
  availableStock: number;
}

export interface CartState {
  items: CartItem[];
}

type CartProduct = Pick<ProductDto, "id" | "name" | "sku" | "salePrice" | "stock">;

export type CartAction =
  | { type: "add"; product: CartProduct }
  | { type: "increment"; productId: number }
  | { type: "decrement"; productId: number }
  | { type: "remove"; productId: number }
  | { type: "clear" };

export const initialCartState: CartState = { items: [] };

/**
 * Si el producto ya está en el carrito, incrementa su cantidad en vez de crear una línea
 * duplicada (agregar "Coca-Cola" dos veces termina en una línea con cantidad 2, no en dos líneas).
 */
export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "add": {
      const { product } = action;
      const existing = state.items.find((item) => item.productId === product.id);
      if (existing) {
        return {
          items: state.items.map((item) =>
            item.productId === product.id
              ? { ...item, quantity: item.quantity + 1, availableStock: product.stock }
              : item,
          ),
        };
      }
      return {
        items: [
          ...state.items,
          {
            productId: product.id,
            name: product.name,
            sku: product.sku,
            unitPrice: product.salePrice,
            quantity: 1,
            availableStock: product.stock,
          },
        ],
      };
    }
    case "increment":
      return {
        items: state.items.map((item) =>
          item.productId === action.productId ? { ...item, quantity: item.quantity + 1 } : item,
        ),
      };
    case "decrement":
      return {
        items: state.items.map((item) =>
          item.productId === action.productId && item.quantity > 1
            ? { ...item, quantity: item.quantity - 1 }
            : item,
        ),
      };
    case "remove":
      return { items: state.items.filter((item) => item.productId !== action.productId) };
    case "clear":
      return initialCartState;
    default:
      return state;
  }
}

export function selectCartTotal(state: CartState): number {
  return state.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

/** Estado del carrito de la venta en curso — vive localmente en `SalesPage`, no hay razón todavía
 *  para un store global (ver `M10 — Decisiones`). */
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
