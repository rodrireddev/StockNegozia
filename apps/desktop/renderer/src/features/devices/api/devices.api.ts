import type { DeviceDto, DeviceRole } from "@stocknegozia/api-contracts";
import type { UpdateSellerNameInput } from "@stocknegozia/validation";
import { apiGet, apiPatch, apiPost } from "@/lib/api-client";

export function fetchDevices(): Promise<DeviceDto[]> {
  return apiGet<DeviceDto[]>("/auth/devices");
}

/** El dispositivo que hace la request — usado para no ofrecer "Revocar" sobre uno mismo. */
export function fetchMe(): Promise<DeviceDto> {
  return apiGet<DeviceDto>("/auth/devices/me");
}

/** Fija el "vendedor actual" de ESTE dispositivo — siempre auto-servicio, nunca por id. */
export function updateSellerName(input: UpdateSellerNameInput): Promise<DeviceDto> {
  return apiPatch<DeviceDto>("/auth/devices/me/seller-name", input);
}

export function updateDeviceRole(id: string, role: DeviceRole): Promise<DeviceDto> {
  return apiPatch<DeviceDto>(`/auth/devices/${id}/role`, { role });
}

export function revokeDevice(id: string): Promise<DeviceDto> {
  return apiPost<DeviceDto>(`/auth/devices/${id}/revoke`);
}
