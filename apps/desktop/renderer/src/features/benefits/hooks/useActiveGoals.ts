import { useQuery } from "@tanstack/react-query";
import { useAccount } from "../AccountContext";
import { getActiveGoals } from "../api/gamification.api";

/** Objetivos programados vigentes ahora, progreso ya calculado por el server (mismo endpoint que mobile-mini). */
export function useActiveGoals() {
  const { status } = useAccount();

  const goalsQuery = useQuery({
    queryKey: ["benefits", "active-goals"],
    queryFn: getActiveGoals,
    enabled: status === "authenticated",
  });

  return { goals: goalsQuery.data ?? [], isLoading: goalsQuery.isLoading };
}
