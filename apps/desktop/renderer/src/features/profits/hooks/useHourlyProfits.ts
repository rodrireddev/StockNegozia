import { useQuery } from "@tanstack/react-query";
import { fetchHourlyProfits } from "../api/profits.api";

export function useHourlyProfits(date?: string) {
  return useQuery({
    queryKey: ["profits", "hourly", date],
    queryFn: () => fetchHourlyProfits(date),
  });
}
