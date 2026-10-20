import type { PurchaseDto } from "@stocknegozia/api-contracts";
import type { CreatePurchaseInput } from "@stocknegozia/validation";
import { purchasesService } from "@/features/purchases/data/service";

export async function createPurchase(input: CreatePurchaseInput): Promise<PurchaseDto> {
  return purchasesService.create(input);
}
