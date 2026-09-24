import type { ActiveHouseAdDto } from "@stocknegozia/api-contracts";
import { cloudApiGet, cloudApiPost } from "@/lib/cloud-api-client";

export function fetchActiveHouseAd(): Promise<ActiveHouseAdDto | null> {
  return cloudApiGet<ActiveHouseAdDto | null>("/ads/house-ad/active");
}

export function recordHouseAdImpression(id: string): Promise<void> {
  return cloudApiPost<void>(`/ads/house-ad/${encodeURIComponent(id)}/impression`, {});
}
