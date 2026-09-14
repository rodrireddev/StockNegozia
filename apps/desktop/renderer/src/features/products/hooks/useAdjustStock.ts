import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adjustProductStock } from "../api/products.api";

export function useAdjustStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stock, reason }: { id: number; stock: number; reason: string }) =>
      adjustProductStock(id, { stock, reason }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
