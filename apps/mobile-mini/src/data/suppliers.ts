import type { SupplierDto } from "@stocknegozia/api-contracts";
import type { CreateSupplierInput, UpdateSupplierInput } from "@stocknegozia/validation";
import { suppliersService } from "@/features/suppliers/data/service";

export async function fetchSuppliers(): Promise<SupplierDto[]> {
  return suppliersService.findAll();
}

export async function createSupplier(input: CreateSupplierInput): Promise<SupplierDto> {
  return suppliersService.create(input);
}

export async function updateSupplier(id: number, input: UpdateSupplierInput): Promise<SupplierDto> {
  return suppliersService.update(id, input);
}
