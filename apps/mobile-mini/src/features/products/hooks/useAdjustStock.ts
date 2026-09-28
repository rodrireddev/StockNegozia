import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "@/accounts/AccountContext";
import { adjustProductStock } from "@/data/products";
import { fireRecordActivity } from "@/features/benefits/gamificationTriggers";

interface AdjustStockVariables {
  id: number;
  stock: number;
  reason: string;
  /** Stock antes del ajuste — lo conoce el caller (edita este producto puntual), se usa solo para
   *  decidir `stock_adjustment_in` vs `_out` (doc de logros, whitelist de métricas), nunca se manda al server. */
  previousStock: number;
}

export function useAdjustStock() {
  const queryClient = useQueryClient();
  const { status } = useAccount();
  return useMutation({
    mutationFn: ({ id, stock, reason }: AdjustStockVariables) => adjustProductStock(id, { stock, reason }),
    onSuccess: (_data, variables) => {
      // El ajuste genera un stock_movement ADJUSTMENT — invalida también el historial.
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      // Movimiento de stock = "algo real" para la racha (doc §2) + métrica de logros (whitelist).
      if (status === "authenticated" && variables.stock !== variables.previousStock) {
        fireRecordActivity(variables.stock > variables.previousStock ? "stock_adjustment_in" : "stock_adjustment_out");
        void queryClient.invalidateQueries({ queryKey: ["active-goals"] });
      }
    },
  });
}
