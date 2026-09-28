import type { CreateSupplierInput } from "@stocknegozia/validation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "@/accounts/AccountContext";
import { createSupplier } from "@/data/suppliers";
import { fireRecordActivity } from "@/features/benefits/gamificationTriggers";

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  const { status } = useAccount();
  return useMutation({
    mutationFn: (input: CreateSupplierInput) => createSupplier(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      if (status === "authenticated") {
        fireRecordActivity("supplier_created");
        void queryClient.invalidateQueries({ queryKey: ["active-goals"] });
      }
    },
  });
}
