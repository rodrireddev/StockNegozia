import { useQuery } from "@tanstack/react-query";
import { fetchAchievementRevisions } from "../api/achievements.api";

export function useAchievementRevisions(key: string | null) {
  return useQuery({
    queryKey: ["achievements", key, "revisions"],
    queryFn: () => fetchAchievementRevisions(key as string),
    enabled: key !== null,
  });
}
