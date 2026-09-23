import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UpdateCreditConfigItemInput } from "@stocknegozia/validation";
import { updateCreditConfigItem } from "../api/credit-config.api";

export function useUpdateCreditConfigItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, input }: { key: string; input: UpdateCreditConfigItemInput }) =>
      updateCreditConfigItem(key, input),
    onSuccess: (_result, { key }) => {
      void queryClient.invalidateQueries({ queryKey: ["credit-config"] });
      void queryClient.invalidateQueries({ queryKey: ["credit-config", key, "revisions"] });
    },
  });
}
