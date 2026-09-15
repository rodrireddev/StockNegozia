import type { CategoryDto, ProductDto } from "@stocknegozia/api-contracts";

export interface CategoryCount {
  id: number | null;
  name: string;
  productCount: number;
}

/**
 * Categories no tiene endpoint de conteo — se deriva client-side a partir de la lista de
 * productos ya cargada (mismo dato que consume la pestaña Stock), sin pedir nada nuevo al
 * backend. `categories` (no los productos) es la fuente de qué categorías existen: una categoría
 * sin productos asignados todavía debe listarse igual, con 0.
 */
export function countProductsByCategory(
  categories: CategoryDto[],
  products: ProductDto[],
): CategoryCount[] {
  const counts = new Map<number, number>();
  let uncategorized = 0;

  for (const product of products) {
    if (product.categoryId === null) {
      uncategorized += 1;
    } else {
      counts.set(product.categoryId, (counts.get(product.categoryId) ?? 0) + 1);
    }
  }

  const result: CategoryCount[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
    productCount: counts.get(category.id) ?? 0,
  }));

  if (uncategorized > 0) {
    result.push({ id: null, name: "Sin categoría", productCount: uncategorized });
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}
