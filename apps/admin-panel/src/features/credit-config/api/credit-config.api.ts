import type { CreditConfigItemDto, CreditConfigItemRevisionDto } from "@stocknegozia/api-contracts";
import type { UpdateCreditConfigItemInput } from "@stocknegozia/validation";
import { apiGet, apiPatch } from "@/lib/api-client";

export function fetchCreditConfigItems(): Promise<CreditConfigItemDto[]> {
  return apiGet<CreditConfigItemDto[]>("/admin/credit-config");
}

export function fetchCreditConfigRevisions(key: string): Promise<CreditConfigItemRevisionDto[]> {
  return apiGet<CreditConfigItemRevisionDto[]>(
    `/admin/credit-config/${encodeURIComponent(key)}/revisions`,
  );
}

export function updateCreditConfigItem(
  key: string,
  input: UpdateCreditConfigItemInput,
): Promise<CreditConfigItemDto> {
  return apiPatch<CreditConfigItemDto>(`/admin/credit-config/${encodeURIComponent(key)}`, input);
}
