import type { ProductQueryInput } from "@stocknegozia/validation";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts } from "../api/products.api";

export function useProducts(query: Partial<ProductQueryInput>) {
  return useQuery({
    queryKey: ["products", query],
    queryFn: () => fetchProducts(query),
  });
}
