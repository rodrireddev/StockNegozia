import type { ProductDto } from "@stocknegozia/api-contracts";

export interface PurchaseCartItem {
  productId: number;
  name: string;
  sku: string;
  quantity: number;
  unitCost: number;
}

export interface PurchaseCartState {
  items: PurchaseCartItem[];
}

export type PurchaseCartProduct = Pick<ProductDto, "id" | "name" | "sku" | "purchasePrice">;

export type PurchaseCartAction =
  | { type: "add"; product: PurchaseCartProduct }
  | { type: "setQuantity"; productId: number; quantity: number }
  | { type: "setUnitCost"; productId: number; unitCost: number }
  | { type: "remove"; productId: number }
  | { type: "clear" };

export const initialPurchaseCartState: PurchaseCartState = { items: [] };

/**
 * Mismo patrón que el carrito de Ventas, pero independiente: una compra no tiene el concepto de
 * "stock disponible" (siempre está sumando stock, nunca lo consume) y en cambio necesita
 * `unitCost` editable por línea, algo que Ventas no maneja. Forzar un reducer compartido entre
 * ambos hubiera significado una forma genérica de "transacción" con flags para lo que cada una
 * necesita — exactamente lo que se pidió evitar; lo que SÍ se comparte es este mismo reducer entre
 * Desktop y Mobile (cada uno lo envuelve en su propio `useReducer` local).
 */
export function purchaseCartReducer(
  state: PurchaseCartState,
  action: PurchaseCartAction,
): PurchaseCartState {
  switch (action.type) {
    case "add": {
      const { product } = action;
      const existing = state.items.find((item) => item.productId === product.id);
      if (existing) {
        return {
          items: state.items.map((item) =>
            item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item,
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
            quantity: 1,
            unitCost: product.purchasePrice,
          },
        ],
      };
    }
    case "setQuantity":
      if (!Number.isInteger(action.quantity) || action.quantity < 1) return state;
      return {
        items: state.items.map((item) =>
          item.productId === action.productId ? { ...item, quantity: action.quantity } : item,
        ),
      };
    case "setUnitCost":
      if (!Number.isFinite(action.unitCost) || action.unitCost < 0) return state;
      return {
        items: state.items.map((item) =>
          item.productId === action.productId ? { ...item, unitCost: action.unitCost } : item,
        ),
      };
    case "remove":
      return { items: state.items.filter((item) => item.productId !== action.productId) };
    case "clear":
      return initialPurchaseCartState;
    default:
      return state;
  }
}

export function selectPurchaseCartTotal(state: PurchaseCartState): number {
  return state.items.reduce((sum, item) => sum + item.unitCost * item.quantity, 0);
}
