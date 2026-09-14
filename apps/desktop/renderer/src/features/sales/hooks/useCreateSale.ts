import type { CreateSaleInput } from "@stocknegozia/validation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSale } from "../api/sales.api";

export function useCreateSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSaleInput) => createSale(input),
    onSuccess: () => {
      // La venta descuenta stock y genera un stock_movement SALE — invalida lo que depende de
      // eso (mismo patrón que useAdjustStock/useCreatePurchase).
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
    },
  });
}
