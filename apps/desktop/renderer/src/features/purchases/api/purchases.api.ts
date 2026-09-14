import type { PurchaseDto } from "@stocknegozia/api-contracts";
import type { CreatePurchaseInput } from "@stocknegozia/validation";
import { apiPost } from "@/lib/api-client";

export function createPurchase(input: CreatePurchaseInput): Promise<PurchaseDto> {
  return apiPost<PurchaseDto>("/purchases", input);
}
