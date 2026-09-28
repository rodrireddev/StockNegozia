import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UpdateAchievementInput } from "@stocknegozia/validation";
import { updateAchievement } from "../api/achievements.api";

export function useUpdateAchievement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, input }: { key: string; input: UpdateAchievementInput }) => updateAchievement(key, input),
    onSuccess: (_result, { key }) => {
      void queryClient.invalidateQueries({ queryKey: ["achievements"] });
      void queryClient.invalidateQueries({ queryKey: ["achievements", key, "revisions"] });
    },
  });
}
