import type {
  AchievementDto,
  ActiveGoalDto,
  RecordActivityResult,
  RewardedAdClaimResult,
  RewardedAdStatusDto,
  SetupQuestClaimResult,
} from "@stocknegozia/api-contracts";
import { apiGet, apiPost } from "./client";

export function recordActivity(
  metricType: string,
  clientEventId: string,
  occurredOn: string,
): Promise<RecordActivityResult> {
  return apiPost<RecordActivityResult>("/gamification/activity", {
    metricType,
    clientEventId,
    occurredOn,
  });
}

export function claimSetupQuest(questKey: string): Promise<SetupQuestClaimResult> {
  return apiPost<SetupQuestClaimResult>(`/gamification/setup-quests/${questKey}/claim`);
}

/** Objetivos programados vigentes ahora (puede haber varios a la vez), con progreso ya calculado por el server. */
export function getActiveGoals(): Promise<ActiveGoalDto[]> {
  return apiGet<ActiveGoalDto[]>("/gamification/goals/active");
}

export function claimRewardedAd(): Promise<RewardedAdClaimResult> {
  return apiPost<RewardedAdClaimResult>("/gamification/rewarded-ad/claim");
}

export function getRewardedAdStatus(): Promise<RewardedAdStatusDto> {
  return apiGet<RewardedAdStatusDto>("/gamification/rewarded-ad/status");
}

export function listAchievements(): Promise<AchievementDto[]> {
  return apiGet<AchievementDto[]>("/accounts/me/achievements");
}
