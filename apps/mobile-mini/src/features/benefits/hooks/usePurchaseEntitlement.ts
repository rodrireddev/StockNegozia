import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "@/accounts/AccountContext";
import { purchaseEntitlement } from "@/accounts/api/entitlements.api";

export function usePurchaseEntitlement() {
  const queryClient = useQueryClient();
  const { refetchMe } = useAccount();

  return useMutation({
    mutationFn: (type: string) => purchaseEntitlement(type),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["entitlements", "catalog"] });
      void refetchMe(); // el saldo cambió
    },
  });
}
