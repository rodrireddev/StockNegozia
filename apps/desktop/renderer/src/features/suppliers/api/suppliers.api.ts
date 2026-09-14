import type { SupplierDto } from "@stocknegozia/api-contracts";
import type { CreateSupplierInput } from "@stocknegozia/validation";
import { apiGet, apiPost } from "@/lib/api-client";

export function fetchSuppliers(): Promise<SupplierDto[]> {
  return apiGet<SupplierDto[]>("/suppliers");
}

export function createSupplier(input: CreateSupplierInput): Promise<SupplierDto> {
  return apiPost<SupplierDto>("/suppliers", input);
}
