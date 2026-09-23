import { useQuery } from "@tanstack/react-query";
import { fetchCreditConfigItems } from "../api/credit-config.api";

export function useCreditConfigItems() {
  return useQuery({
    queryKey: ["credit-config"],
    queryFn: fetchCreditConfigItems,
  });
}
