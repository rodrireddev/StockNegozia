import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adjustProductStock } from "../api/products.api";

export function useAdjustStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stock, reason }: { id: number; stock: number; reason: string }) =>
      adjustProductStock(id, { stock, reason }),
    onSuccess: () => {
      // El ajuste genera un stock_movement ADJUSTMENT — invalida también el historial (M11).
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
    },
  });
}
