export type DeviceType = "desktop" | "mobile" | "tablet" | "web" | "other";
export type DeviceStatus = "active" | "revoked";

export interface AuthenticatedDevice {
  id: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  lastSeenAt: Date | null;
  isAdmin: boolean;
  sellerName: string | null;
}
