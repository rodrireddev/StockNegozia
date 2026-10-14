import type { PurchaseDto, PurchaseSummaryDto } from "@stocknegozia/api-contracts";
import type { CreatePurchaseInput } from "@stocknegozia/validation";
import { purchasesService } from "@/features/purchases/data/service";

export async function fetchPurchases(
  filters: { from?: Date; to?: Date } = {},
): Promise<PurchaseSummaryDto[]> {
  return purchasesService.findMany(filters);
}

export async function fetchPurchase(id: number): Promise<PurchaseDto> {
  return purchasesService.findById(id);
}

export async function createPurchase(input: CreatePurchaseInput): Promise<PurchaseDto> {
  return purchasesService.create(input);
}
