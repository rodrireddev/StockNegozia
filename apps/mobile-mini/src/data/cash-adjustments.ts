import {
  cashAdjustmentsService,
  type CashAdjustmentDto,
  type CreateCashAdjustmentInput,
} from "@/features/cash-adjustments/data/service";
import type { CashAdjustmentFilters } from "@/features/cash-adjustments/data/repository";

export async function fetchCashAdjustments(filters: CashAdjustmentFilters = {}): Promise<CashAdjustmentDto[]> {
  return cashAdjustmentsService.findMany(filters);
}

export async function createCashAdjustment(input: CreateCashAdjustmentInput): Promise<CashAdjustmentDto> {
  return cashAdjustmentsService.create(input);
}
