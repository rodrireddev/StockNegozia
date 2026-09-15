import type { ProductDto } from "@stocknegozia/api-contracts";
import { apiGet } from "@/api/client";

/**
 * `GET /products` sin filtros — M15 solo necesita demostrar la cadena completa (auth → API →
 * backend → productos reales), no el CRUD completo de inventario (eso ya existe en Desktop y
 * queda fuera de alcance acá, ver docs/mobile/MOBILE_CLIENT.md §Products).
 */
export function fetchProducts(): Promise<ProductDto[]> {
  return apiGet<ProductDto[]>("/products");
}
