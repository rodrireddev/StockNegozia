import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UpdateAdPlacementInput } from "@stocknegozia/validation";
import { updateAdPlacement } from "../api/ads.api";

export function useUpdateAdPlacement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      key,
      platform,
      input,
    }: {
      key: string;
      platform: string;
      input: UpdateAdPlacementInput;
    }) => updateAdPlacement(key, platform, input),
    onSuccess: (_result, { key, platform }) => {
      void queryClient.invalidateQueries({ queryKey: ["ad-placements"] });
      void queryClient.invalidateQueries({
        queryKey: ["ad-placements", key, platform, "revisions"],
      });
    },
  });
}
