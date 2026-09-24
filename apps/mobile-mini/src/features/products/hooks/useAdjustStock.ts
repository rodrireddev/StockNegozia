import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "@/accounts/AccountContext";
import { adjustProductStock } from "@/data/products";
import { fireRecordActivity } from "@/features/benefits/gamificationTriggers";

export function useAdjustStock() {
  const queryClient = useQueryClient();
  const { status } = useAccount();
  return useMutation({
    mutationFn: ({ id, stock, reason }: { id: number; stock: number; reason: string }) =>
      adjustProductStock(id, { stock, reason }),
    onSuccess: () => {
      // El ajuste genera un stock_movement ADJUSTMENT — invalida también el historial.
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      // Movimiento de stock = "algo real" para la racha (doc §2).
      if (status === "authenticated") {
        fireRecordActivity();
        void queryClient.invalidateQueries({ queryKey: ["daily-mission"] });
      }
    },
  });
}
