import type { SaleDto } from "@stocknegozia/api-contracts";
import type { CreateSaleInput } from "@stocknegozia/validation";
import { apiPost } from "@/lib/api-client";

export function createSale(input: CreateSaleInput): Promise<SaleDto> {
  return apiPost<SaleDto>("/sales", input);
}
