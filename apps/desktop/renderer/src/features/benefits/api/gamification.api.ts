import type { AchievementDto, ActiveGoalDto } from "@stocknegozia/api-contracts";
import { cloudApiGet } from "@/lib/cloud-api-client";

/** Objetivos programados vigentes ahora (puede haber varios a la vez), progreso ya calculado por el server. */
export function getActiveGoals(): Promise<ActiveGoalDto[]> {
  return cloudApiGet<ActiveGoalDto[]>("/gamification/goals/active");
}

export function listAchievements(): Promise<AchievementDto[]> {
  return cloudApiGet<AchievementDto[]>("/accounts/me/achievements");
}
