export type DeviceType = "desktop" | "mobile" | "web";
export type DeviceStatus = "active" | "revoked";

export interface AuthenticatedDevice {
  id: string;
  name: string;
  status: DeviceStatus;
  lastSeenAt: Date | null;
}
