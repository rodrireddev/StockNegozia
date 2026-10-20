import type { ActiveAdPlacementDto, AdPlatform } from "@stocknegozia/api-contracts";
import { apiGet } from "./client";

/** `null` si no hay placement configurado para esa key/plataforma o está deshabilitado (kill
 *  switch, doc ADS_CREDITS_GAMIFICATION.md §1bis) — el llamador decide su propio fallback. */
export function getAdPlacement(
  key: string,
  platform: AdPlatform,
): Promise<ActiveAdPlacementDto | null> {
  return apiGet<ActiveAdPlacementDto | null>(`/ads/placements/${key}?platform=${platform}`);
}
