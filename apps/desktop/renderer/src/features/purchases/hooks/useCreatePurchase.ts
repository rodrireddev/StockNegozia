import type { CreatePurchaseInput } from "@stocknegozia/validation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPurchase } from "../api/purchases.api";

export function useCreatePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePurchaseInput) => createPurchase(input),
    onSuccess: () => {
      // La compra suma stock y genera un stock_movement PURCHASE — se invalida todo lo que
      // depende de eso (mismo criterio que useCreateSale en Ventas).
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      void queryClient.invalidateQueries({ queryKey: ["purchases"] });
    },
  });
}
