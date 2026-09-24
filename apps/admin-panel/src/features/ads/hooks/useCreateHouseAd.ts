import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateHouseAdInput } from "@stocknegozia/validation";
import { createHouseAd } from "../api/ads.api";

export function useCreateHouseAd() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateHouseAdInput) => createHouseAd(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["house-ads"] });
    },
  });
}
