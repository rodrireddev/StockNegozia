import { useQuery } from "@tanstack/react-query";
import { fetchActiveHouseAd } from "../api/ads.api";

export function useActiveHouseAd() {
  return useQuery({
    queryKey: ["house-ad", "active"],
    queryFn: fetchActiveHouseAd,
    // El cloud-backend puede no estar levantado en una instalación local (sin deploy todavía) —
    // no reintentar en loop, el banner simplemente no aparece si falla (ver AdBanner).
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}
