import type { CashAdjustmentDto } from "@stocknegozia/api-contracts";
import type { CreateCashAdjustmentInput } from "@stocknegozia/validation";
import { apiGet, apiPost } from "@/api/client";

export function fetchCashAdjustments(): Promise<CashAdjustmentDto[]> {
  return apiGet<CashAdjustmentDto[]>("/cash-adjustments");
}

export function createCashAdjustment(input: CreateCashAdjustmentInput): Promise<CashAdjustmentDto> {
  return apiPost<CashAdjustmentDto>("/cash-adjustments", input);
}
