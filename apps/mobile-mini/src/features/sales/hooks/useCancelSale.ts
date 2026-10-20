import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cancelSale } from "@/data/sales";

export function useCancelSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (saleId: number) => cancelSale(saleId),
    onSuccess: () => {
      // Devuelve stock (movimiento SALE_CANCELLATION) y saca la venta de Ganancias.
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      void queryClient.invalidateQueries({ queryKey: ["profits"] });
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}
