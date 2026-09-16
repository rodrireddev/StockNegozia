import { useQuery } from "@tanstack/react-query";
import { fetchProduct } from "@/data/products";

export function useProduct(id: number | undefined) {
  return useQuery({
    queryKey: ["products", "detail", id],
    queryFn: () => fetchProduct(id as number),
    enabled: id !== undefined,
  });
}
