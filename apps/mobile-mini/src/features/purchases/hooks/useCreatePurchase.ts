import type { CreatePurchaseInput } from "@stocknegozia/validation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "@/accounts/AccountContext";
import { createPurchase } from "@/data/purchases";
import { fireRecordActivity } from "@/features/benefits/gamificationTriggers";

export function useCreatePurchase() {
  const queryClient = useQueryClient();
  const { status } = useAccount();
  return useMutation({
    mutationFn: (input: CreatePurchaseInput) => createPurchase(input),
    onSuccess: () => {
      // La compra suma stock y genera un stock_movement PURCHASE — mismo criterio que useCreateSale.
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      void queryClient.invalidateQueries({ queryKey: ["purchases"] });
      if (status === "authenticated") {
        fireRecordActivity("purchase_registered");
        void queryClient.invalidateQueries({ queryKey: ["active-goals"] });
      }
    },
  });
}
