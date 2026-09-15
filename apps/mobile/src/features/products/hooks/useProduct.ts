import { useQuery } from "@tanstack/react-query";
import { fetchProduct } from "@/api/endpoints/products";

export function useProduct(id: number | undefined) {
  return useQuery({
    queryKey: ["products", "detail", id],
    queryFn: () => fetchProduct(id as number),
    enabled: id !== undefined,
  });
}
