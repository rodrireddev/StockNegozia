import type { CreateSaleInput } from "@stocknegozia/validation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSale } from "../api/sales.api";

export function useCreateSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSaleInput) => createSale(input),
    onSuccess: () => {
      // La venta descuenta stock — invalida la lista de productos para que el resultado de
      // búsqueda y el stock mostrado se actualicen (mismo patrón que useAdjustStock).
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
