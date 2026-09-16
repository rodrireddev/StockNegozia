import type { UpdateProductInput } from "@stocknegozia/validation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProduct } from "@/data/products";

export function useUpdateProduct(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProductInput) => updateProduct(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}
