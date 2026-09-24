import { useQuery } from "@tanstack/react-query";
import { fetchAdPlacementRevisions } from "../api/ads.api";

export function useAdPlacementRevisions(key: string | null, platform: string | null) {
  return useQuery({
    queryKey: ["ad-placements", key, platform, "revisions"],
    queryFn: () => fetchAdPlacementRevisions(key as string, platform as string),
    enabled: key !== null && platform !== null,
  });
}
