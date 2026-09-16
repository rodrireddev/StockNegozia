import type { ProductQueryInput } from "@stocknegozia/validation";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts } from "@/data/products";

export function useProducts(query: Partial<ProductQueryInput> = {}) {
  return useQuery({
    queryKey: ["products", query],
    queryFn: () => fetchProducts(query),
  });
}
