import { useQuery } from "@tanstack/react-query";
import { fetchAchievements } from "../api/achievements.api";

export function useAchievements() {
  return useQuery({
    queryKey: ["achievements"],
    queryFn: fetchAchievements,
  });
}
