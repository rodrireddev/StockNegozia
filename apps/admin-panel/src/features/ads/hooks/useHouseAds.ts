import { useQuery } from "@tanstack/react-query";
import { fetchHouseAds } from "../api/ads.api";

export function useHouseAds() {
  return useQuery({
    queryKey: ["house-ads"],
    queryFn: fetchHouseAds,
  });
}
