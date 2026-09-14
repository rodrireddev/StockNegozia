import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProductActive } from "../api/products.api";

export function useToggleActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      updateProductActive(id, { active }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
