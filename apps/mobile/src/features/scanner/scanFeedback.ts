import type { ScanFeedback } from "./ProductScanner";

/** Fábricas del `ScanFeedback` que `ProductScanner` anima en cada escaneo (ver ese componente) —
 *  centralizadas acá para que Ventas y Compras usen exactamente el mismo texto/formato. */
export function productAddedFeedback(productName: string): ScanFeedback {
  return { type: "success", text1: "✓ Producto agregado", text2: productName };
}

export function scanErrorFeedback(message: string): ScanFeedback {
  return { type: "error", text1: "No se pudo agregar el producto", text2: message };
}
