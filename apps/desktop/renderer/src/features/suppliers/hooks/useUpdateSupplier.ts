import type { UpdateSupplierInput } from "@stocknegozia/validation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateSupplier } from "../api/suppliers.api";

export function useUpdateSupplier(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSupplierInput) => updateSupplier(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
}
