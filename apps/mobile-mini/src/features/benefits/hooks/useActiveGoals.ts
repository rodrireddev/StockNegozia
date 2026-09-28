import { useQuery } from "@tanstack/react-query";
import { useAccount } from "@/accounts/AccountContext";
import { getActiveGoals } from "@/accounts/api/gamification.api";

/**
 * Objetivos programados vigentes ahora (puede haber varios a la vez: diario + semanal + fecha
 * específica, simultáneos) — el progreso ya viene calculado por el server
 * (`GET /gamification/goals/active`), esta pantalla solo lo muestra. Reemplaza a
 * `useDailyMissionProgress`, que contaba el progreso local con un switch hardcodeado por
 * `missionKey` — ese conteo ahora es 100% responsabilidad del server (ver
 * `ScheduledGoalsService` en `cloud-backend`), esta app nunca vuelve a contar nada.
 */
export function useActiveGoals() {
  const { status } = useAccount();

  const goalsQuery = useQuery({
    queryKey: ["active-goals"],
    queryFn: getActiveGoals,
    enabled: status === "authenticated",
  });

  return { goals: goalsQuery.data ?? [], isLoading: goalsQuery.isLoading };
}
