import type {
  AccountMeDto,
  ActiveAdPlacementDto,
  AdPlatform,
  ActiveGoalDto,
  CloudAccountStatusDto,
  RewardedAdClaimResult,
  RewardedAdStatusDto,
} from "@stocknegozia/api-contracts";
import { apiGet, apiPost } from "@/api/client";

/**
 * Todo esto le pega a `apps/backend` (el mismo LAN backend de siempre, mismo `apiGet`/`apiPost`
 * con el credential del propio dispositivo) — nunca directo a `apps/cloud-backend`. El proxy
 * `cloud-account` reenvía con el JWT que Electron main le empujó (doc
 * ADS_CREDITS_GAMIFICATION.md §6); este dispositivo no conoce ni el JWT ni la URL de cloud-backend.
 */
export function getCloudAccountStatus(): Promise<CloudAccountStatusDto> {
  return apiGet<CloudAccountStatusDto>("/cloud-account/status");
}

export function getMe(): Promise<AccountMeDto> {
  return apiGet<AccountMeDto>("/cloud-account/me");
}

/** Objetivos programados vigentes ahora (puede haber varios a la vez), progreso ya calculado por el server. */
export function getActiveGoals(): Promise<ActiveGoalDto[]> {
  return apiGet<ActiveGoalDto[]>("/cloud-account/goals/active");
}

export function getRewardedAdStatus(): Promise<RewardedAdStatusDto> {
  return apiGet<RewardedAdStatusDto>("/cloud-account/rewarded-ad/status");
}

/** `null` si no hay placement configurado para esa key/plataforma o está deshabilitado (kill switch). */
export function getAdPlacement(key: string, platform: AdPlatform): Promise<ActiveAdPlacementDto | null> {
  return apiGet<ActiveAdPlacementDto | null>(
    `/cloud-account/ads/placement/${encodeURIComponent(key)}?platform=${platform}`,
  );
}

export function claimRewardedAd(): Promise<RewardedAdClaimResult> {
  return apiPost<RewardedAdClaimResult>("/cloud-account/rewarded-ad/claim");
}
