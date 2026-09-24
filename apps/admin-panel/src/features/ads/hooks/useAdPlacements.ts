import { useQuery } from "@tanstack/react-query";
import { fetchAdPlacements } from "../api/ads.api";

export function useAdPlacements() {
  return useQuery({
    queryKey: ["ad-placements"],
    queryFn: fetchAdPlacements,
  });
}
