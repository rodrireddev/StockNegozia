import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "@/accounts/AccountContext";
import { createCashAdjustment } from "@/data/cash-adjustments";
import { fireRecordActivity } from "@/features/benefits/gamificationTriggers";
import type { CreateCashAdjustmentInput } from "../data/service";

export function useCreateCashAdjustment() {
  const queryClient = useQueryClient();
  const { status } = useAccount();
  return useMutation({
    mutationFn: (input: CreateCashAdjustmentInput) => createCashAdjustment(input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["cash-adjustments"] });
      // Un ajuste de caja se mezcla con las ventas en el historial/gráfico de Ganancias.
      void queryClient.invalidateQueries({ queryKey: ["profits"] });
      if (status === "authenticated") {
        fireRecordActivity(variables.direction === "IN" ? "cash_adjustment_in" : "cash_adjustment_out");
        void queryClient.invalidateQueries({ queryKey: ["active-goals"] });
      }
    },
  });
}
