import { useQuery } from "@tanstack/react-query";
import { fetchDailyProfits } from "@/data/profits";

export function useDailyProfits(days = 7) {
  return useQuery({
    queryKey: ["profits", "daily", days],
    queryFn: () => fetchDailyProfits(days),
  });
}
