import type { DeviceDto } from "@stocknegozia/api-contracts";
import type { UpdateDeviceInput, UpdateSellerNameInput } from "@stocknegozia/validation";
import { apiGet, apiPatch, apiPost } from "@/lib/api-client";

export function fetchDevices(): Promise<DeviceDto[]> {
  return apiGet<DeviceDto[]>("/auth/devices");
}

/** El dispositivo que hace la request — usado para no ofrecer "Revocar" sobre uno mismo. */
export function fetchMe(): Promise<DeviceDto> {
  return apiGet<DeviceDto>("/auth/devices/me");
}

export function renameDevice(id: string, input: UpdateDeviceInput): Promise<DeviceDto> {
  return apiPatch<DeviceDto>(`/auth/devices/${id}`, input);
}

/** Fija el "vendedor actual" de ESTE dispositivo — siempre auto-servicio, nunca por id. */
export function updateSellerName(input: UpdateSellerNameInput): Promise<DeviceDto> {
  return apiPatch<DeviceDto>("/auth/devices/me/seller-name", input);
}

export function revokeDevice(id: string): Promise<DeviceDto> {
  return apiPost<DeviceDto>(`/auth/devices/${id}/revoke`);
}
