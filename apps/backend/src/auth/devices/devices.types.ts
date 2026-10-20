export type DeviceType = "desktop" | "mobile" | "tablet" | "web" | "other";
export type DeviceStatus = "active" | "revoked";
export type DeviceRole = "manager" | "cashier";

export interface AuthenticatedDevice {
  id: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  lastSeenAt: Date | null;
  isAdmin: boolean;
  role: DeviceRole;
  sellerName: string | null;
}
