import type { PaymentTermsDto, SettingsDto } from "@stocknegozia/api-contracts";
import type { PaymentTermsInput, UpdateSettingsInput } from "@stocknegozia/validation";
import { apiGet, apiPatch, apiPut } from "@/lib/api-client";

export function fetchSettings(): Promise<SettingsDto> {
  return apiGet<SettingsDto>("/settings");
}

export function updateSettings(input: UpdateSettingsInput): Promise<SettingsDto> {
  return apiPatch<SettingsDto>("/settings", input);
}

export function fetchPaymentTerms(): Promise<PaymentTermsDto> {
  return apiGet<PaymentTermsDto>("/settings/payment-terms");
}

export function updatePaymentTerms(input: PaymentTermsInput): Promise<PaymentTermsDto> {
  return apiPut<PaymentTermsDto>("/settings/payment-terms", input);
}
