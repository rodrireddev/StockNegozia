import type {
  EntitlementCatalogItemDto,
  PurchaseEntitlementResult,
} from "@stocknegozia/api-contracts";
import { apiGet, apiPost } from "./client";

export function fetchEntitlementsCatalog(): Promise<EntitlementCatalogItemDto[]> {
  return apiGet<EntitlementCatalogItemDto[]>("/credits/me/entitlements/catalog");
}

export function purchaseEntitlement(type: string): Promise<PurchaseEntitlementResult> {
  return apiPost<PurchaseEntitlementResult>(
    `/credits/me/entitlements/${encodeURIComponent(type)}/purchase`,
  );
}
