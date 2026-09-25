import type {
  AchievementDto,
  DailyMissionClaimResult,
  DailyMissionTodayDto,
  RecordActivityResult,
  RewardedAdClaimResult,
  RewardedAdStatusDto,
  SetupQuestClaimResult,
} from "@stocknegozia/api-contracts";
import { apiGet, apiPost } from "./client";

export function recordActivity(): Promise<RecordActivityResult> {
  return apiPost<RecordActivityResult>("/gamification/activity");
}

export function claimSetupQuest(questKey: string): Promise<SetupQuestClaimResult> {
  return apiPost<SetupQuestClaimResult>(`/gamification/setup-quests/${questKey}/claim`);
}

export function getTodayMission(): Promise<DailyMissionTodayDto> {
  return apiGet<DailyMissionTodayDto>("/gamification/daily-mission/today");
}

export function claimDailyMission(): Promise<DailyMissionClaimResult> {
  return apiPost<DailyMissionClaimResult>("/gamification/daily-mission/claim");
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
