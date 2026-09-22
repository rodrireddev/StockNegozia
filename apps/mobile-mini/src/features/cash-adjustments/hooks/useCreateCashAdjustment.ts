import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCashAdjustment } from "@/data/cash-adjustments";
import type { CreateCashAdjustmentInput } from "../data/service";

export function useCreateCashAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCashAdjustmentInput) => createCashAdjustment(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cash-adjustments"] });
      // Un ajuste de caja se mezcla con las ventas en el historial/gráfico de Ganancias.
      void queryClient.invalidateQueries({ queryKey: ["profits"] });
    },
  });
}
