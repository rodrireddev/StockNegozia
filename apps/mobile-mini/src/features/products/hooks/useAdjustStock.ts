import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adjustProductStock } from "@/data/products";

export function useAdjustStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stock, reason }: { id: number; stock: number; reason: string }) =>
      adjustProductStock(id, { stock, reason }),
    onSuccess: () => {
      // El ajuste genera un stock_movement ADJUSTMENT — invalida también el historial.
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
    },
  });
}
