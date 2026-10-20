import type {
  AdPlacementDto,
  AdPlacementRevisionDto,
  HouseAdDto,
} from "@stocknegozia/api-contracts";
import type {
  CreateHouseAdInput,
  UpdateAdPlacementInput,
  UpdateHouseAdInput,
} from "@stocknegozia/validation";
import { apiGet, apiPatch, apiPost } from "@/lib/api-client";

export function fetchAdPlacements(): Promise<AdPlacementDto[]> {
  return apiGet<AdPlacementDto[]>("/admin/ad-placements");
}

export function fetchAdPlacementRevisions(
  key: string,
  platform: string,
): Promise<AdPlacementRevisionDto[]> {
  return apiGet<AdPlacementRevisionDto[]>(
    `/admin/ad-placements/${encodeURIComponent(key)}/${encodeURIComponent(platform)}/revisions`,
  );
}

export function updateAdPlacement(
  key: string,
  platform: string,
  input: UpdateAdPlacementInput,
): Promise<AdPlacementDto> {
  return apiPatch<AdPlacementDto>(
    `/admin/ad-placements/${encodeURIComponent(key)}/${encodeURIComponent(platform)}`,
    input,
  );
}

export function fetchHouseAds(): Promise<HouseAdDto[]> {
  return apiGet<HouseAdDto[]>("/admin/house-ads");
}

export function createHouseAd(input: CreateHouseAdInput): Promise<HouseAdDto> {
  return apiPost<HouseAdDto>("/admin/house-ads", input);
}

export function updateHouseAd(id: string, input: UpdateHouseAdInput): Promise<HouseAdDto> {
  return apiPatch<HouseAdDto>(`/admin/house-ads/${encodeURIComponent(id)}`, input);
}
