import type { UpdateSellerNameInput } from "@stocknegozia/validation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateSellerName } from "../api/devices.api";

export function useUpdateSellerName() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSellerNameInput) => updateSellerName(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}
