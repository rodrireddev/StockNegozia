import { useQuery } from "@tanstack/react-query";
import { fetchCreditConfigRevisions } from "../api/credit-config.api";

export function useCreditConfigRevisions(key: string | null) {
  return useQuery({
    queryKey: ["credit-config", key, "revisions"],
    queryFn: () => fetchCreditConfigRevisions(key as string),
    enabled: key !== null,
  });
}
