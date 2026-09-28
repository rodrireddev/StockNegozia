import { useQuery } from "@tanstack/react-query";
import { useAccount } from "../AccountContext";
import { listAchievements } from "../api/gamification.api";

export function useAchievements() {
  const { status } = useAccount();

  const achievementsQuery = useQuery({
    queryKey: ["benefits", "achievements"],
    queryFn: listAchievements,
    enabled: status === "authenticated",
  });

  return { achievements: achievementsQuery.data ?? [], isLoading: achievementsQuery.isLoading };
}
