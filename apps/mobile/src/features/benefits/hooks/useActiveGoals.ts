import { useQuery } from "@tanstack/react-query";
import { useCloudAccountStatus } from "@/devices/useCloudAccountStatus";
import { getActiveGoals } from "../api/cloudAccount.api";

/** Objetivos programados vigentes ahora, progreso ya calculado por el server (mismo endpoint que mobile-mini). */
export function useActiveGoals() {
  const { data: status } = useCloudAccountStatus();

  const goalsQuery = useQuery({
    queryKey: ["cloud-account", "active-goals"],
    queryFn: getActiveGoals,
    enabled: status?.linked === true,
  });

  return { goals: goalsQuery.data ?? [], isLoading: goalsQuery.isLoading };
}
