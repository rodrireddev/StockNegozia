import type { AchievementDefinitionDto, AchievementDefinitionRevisionDto } from "@stocknegozia/api-contracts";
import type { CreateAchievementInput, UpdateAchievementInput } from "@stocknegozia/validation";
import { apiGet, apiPatch, apiPost } from "@/lib/api-client";

export function fetchAchievements(): Promise<AchievementDefinitionDto[]> {
  return apiGet<AchievementDefinitionDto[]>("/admin/achievements");
}

export function fetchAchievementRevisions(key: string): Promise<AchievementDefinitionRevisionDto[]> {
  return apiGet<AchievementDefinitionRevisionDto[]>(`/admin/achievements/${encodeURIComponent(key)}/revisions`);
}

export function createAchievement(input: CreateAchievementInput): Promise<AchievementDefinitionDto> {
  return apiPost<AchievementDefinitionDto>("/admin/achievements", input);
}

export function updateAchievement(
  key: string,
  input: UpdateAchievementInput,
): Promise<AchievementDefinitionDto> {
  return apiPatch<AchievementDefinitionDto>(`/admin/achievements/${encodeURIComponent(key)}`, input);
}
