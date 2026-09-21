import { useQuery } from "@tanstack/react-query";
import { fetchDailyProfits } from "../api/profits.api";

export function useDailyProfits(days = 7) {
  return useQuery({
    queryKey: ["profits", "daily", days],
    queryFn: () => fetchDailyProfits(days),
  });
}
