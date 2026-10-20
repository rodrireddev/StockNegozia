import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UpdateHouseAdInput } from "@stocknegozia/validation";
import { updateHouseAd } from "../api/ads.api";

export function useUpdateHouseAd() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateHouseAdInput }) =>
      updateHouseAd(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["house-ads"] });
    },
  });
}
