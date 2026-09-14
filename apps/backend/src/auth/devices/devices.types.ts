export type DeviceType = "desktop" | "mobile" | "tablet" | "web" | "other";
export type DeviceStatus = "active" | "revoked";

export interface AuthenticatedDevice {
  id: string;
  name: string;
  status: DeviceStatus;
  lastSeenAt: Date | null;
  isAdmin: boolean;
}
