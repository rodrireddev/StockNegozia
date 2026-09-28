import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createAchievement } from "../api/achievements.api";

export function useCreateAchievement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAchievement,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["achievements"] });
    },
  });
}
