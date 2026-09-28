import type { CreateSaleInput } from "@stocknegozia/validation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "@/accounts/AccountContext";
import { createSale } from "@/data/sales";
import { fireRecordActivity, fireSetupQuestClaim } from "@/features/benefits/gamificationTriggers";

export function useCreateSale() {
  const queryClient = useQueryClient();
  const { status } = useAccount();
  return useMutation({
    mutationFn: (input: CreateSaleInput) => createSale(input),
    onSuccess: () => {
      // La venta descuenta stock y genera un stock_movement SALE — invalida lo que depende de eso.
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      // También genera una nueva entrada de ganancia (ver `features/profits`).
      void queryClient.invalidateQueries({ queryKey: ["profits"] });
      // Venta = "algo real" para la racha (doc §2) + posible logro de primera venta (doc §1).
      if (status === "authenticated") {
        fireRecordActivity("sale_completed");
        fireSetupQuestClaim("first_sale");
        void queryClient.invalidateQueries({ queryKey: ["active-goals"] });
      }
    },
  });
}
