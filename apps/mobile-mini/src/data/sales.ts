import type { SaleDto, SaleSummaryDto } from "@stocknegozia/api-contracts";
import type { CreateSaleInput } from "@stocknegozia/validation";
import { salesService } from "@/features/sales/data/service";

export async function fetchSales(): Promise<SaleSummaryDto[]> {
  return salesService.findMany();
}

export async function fetchSale(id: number): Promise<SaleDto> {
  return salesService.findById(id);
}

export async function createSale(input: CreateSaleInput): Promise<SaleDto> {
  return salesService.create(input);
}

export async function cancelSale(id: number): Promise<SaleDto> {
  return salesService.cancel(id);
}
