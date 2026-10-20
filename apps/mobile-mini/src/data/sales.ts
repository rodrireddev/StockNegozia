import type { SaleDto } from "@stocknegozia/api-contracts";
import type { CreateSaleInput } from "@stocknegozia/validation";
import { getPaymentTerms } from "@/features/settings/data/paymentTerms";
import { salesService } from "@/features/sales/data/service";

/** Lee las condiciones de cobro vigentes (recargos/comisiones/acreditación) antes de guardar. */
export async function createSale(input: CreateSaleInput): Promise<SaleDto> {
  return salesService.create(input, await getPaymentTerms());
}

export async function cancelSale(id: number): Promise<SaleDto> {
  return salesService.cancel(id);
}
