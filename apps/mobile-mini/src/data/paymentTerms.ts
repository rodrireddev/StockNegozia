import type { PaymentTermsDto } from "@stocknegozia/api-contracts";
import type { PaymentTermsInput } from "@stocknegozia/validation";
import { getPaymentTerms, savePaymentTerms } from "@/features/settings/data/paymentTerms";

/** Misma firma que `apps/mobile/src/api/endpoints/settings.ts` (fetch/updatePaymentTerms). */
export async function fetchPaymentTerms(): Promise<PaymentTermsDto> {
  return getPaymentTerms();
}

export async function updatePaymentTerms(input: PaymentTermsInput): Promise<PaymentTermsDto> {
  return savePaymentTerms(input);
}
