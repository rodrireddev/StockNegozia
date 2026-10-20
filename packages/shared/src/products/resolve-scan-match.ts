import type { ProductDto } from "@stocknegozia/api-contracts";

/**
 * Decide qué producto agregar cuando el usuario confirma un buscador de productos (Ventas o
 * Compras) — ya sea porque tipeó manualmente o porque un lector de código de barras "tipeó" el
 * código y confirmó (los lectores funcionan como un teclado, no requieren integración de
 * hardware).
 *
 * Solo actúa cuando no hay ambigüedad: el texto coincide exactamente con el SKU o el código de
 * barras de algún resultado, o hay un único resultado visible. Con una búsqueda de texto libre
 * que devuelve varias coincidencias parciales (ej. "coca" con dos gaseosas distintas), no agrega
 * nada — evita sumar el producto equivocado por una confirmación apurada.
 */
export function resolveScanMatch(products: ProductDto[], rawQuery: string): ProductDto | undefined {
  const query = rawQuery.trim();
  if (!query) return undefined;

  const exactMatch = products.find((product) => product.sku === query || product.barcode === query);
  if (exactMatch) return exactMatch;

  if (products.length === 1) return products[0];

  return undefined;
}
