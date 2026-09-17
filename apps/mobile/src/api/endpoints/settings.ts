import type { SettingsDto } from "@stocknegozia/api-contracts";
import type { UpdateSettingsInput } from "@stocknegozia/validation";
import { apiGet, apiPatch } from "@/api/client";

export function fetchSettings(): Promise<SettingsDto> {
  return apiGet<SettingsDto>("/settings");
}

export function updateSettings(input: UpdateSettingsInput): Promise<SettingsDto> {
  return apiPatch<SettingsDto>("/settings", input);
}
