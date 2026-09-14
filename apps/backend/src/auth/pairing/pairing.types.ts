export type PairingStatus = "pending" | "confirmed" | "expired" | "cancelled";

export interface PairingSessionRow {
  id: string;
  tokenHash: string;
  verificationCodeHash: string;
  status: PairingStatus;
  deviceId: string | null;
  expiresAt: Date;
  createdAt: Date;
  confirmedAt: Date | null;
}
