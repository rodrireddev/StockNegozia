import { useQuery } from "@tanstack/react-query";
import { listAchievements } from "@/accounts/api/gamification.api";

export function useAchievements() {
  return useQuery({
    queryKey: ["achievements"],
    queryFn: listAchievements,
  });
}
