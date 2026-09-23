import type { CreateCashAdjustmentInput } from "@stocknegozia/validation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCashAdjustment } from "../api/cash-adjustments.api";

export function useCreateCashAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCashAdjustmentInput) => createCashAdjustment(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cash-adjustments"] });
      // Un ajuste de caja se mezcla con las ventas en el historial/gráficos de Ganancias.
      void queryClient.invalidateQueries({ queryKey: ["profits"] });
    },
  });
}
