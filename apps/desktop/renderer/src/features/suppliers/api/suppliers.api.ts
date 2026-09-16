import type { SupplierDto } from "@stocknegozia/api-contracts";
import type { CreateSupplierInput, UpdateSupplierInput } from "@stocknegozia/validation";
import { apiGet, apiPatch, apiPost } from "@/lib/api-client";

export function fetchSuppliers(): Promise<SupplierDto[]> {
  return apiGet<SupplierDto[]>("/suppliers");
}

export function createSupplier(input: CreateSupplierInput): Promise<SupplierDto> {
  return apiPost<SupplierDto>("/suppliers", input);
}

export function updateSupplier(id: number, input: UpdateSupplierInput): Promise<SupplierDto> {
  return apiPatch<SupplierDto>(`/suppliers/${id}`, input);
}
