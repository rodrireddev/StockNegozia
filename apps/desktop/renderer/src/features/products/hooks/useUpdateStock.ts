import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProductStock } from "../api/products.api";

export function useUpdateStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stock }: { id: number; stock: number }) => updateProductStock(id, { stock }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
