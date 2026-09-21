import type { DailyProfitDto, ProfitEntryDto } from "@/features/profits/data/service";
import { profitsService } from "@/features/profits/data/service";
import type { ProfitFilters } from "@/features/profits/data/repository";

export async function fetchProfits(filters: ProfitFilters = {}): Promise<ProfitEntryDto[]> {
  return profitsService.findMany(filters);
}

export async function fetchDailyProfits(days = 7): Promise<DailyProfitDto[]> {
  return profitsService.findDailySummary(days);
}
