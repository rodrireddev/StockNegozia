export type UserLevel = "bronze" | "silver" | "gold" | "pro";

/** Respuesta de `POST /accounts/register` y `POST /accounts/login`. */
export interface AccountAuthResult {
  accessToken: string;
  expiresAt: string;
}

/** Respuesta de `GET /accounts/me` (doc §3). */
export interface AccountMeDto {
  id: string;
  email: string | null;
  level: UserLevel;
  currentStreak: number;
  longestStreak: number;
  referralCode: string;
  isCofounder: boolean;
  creditBalance: number;
}

/** Una fila de `GET /credits/me/ledger`. */
export interface CreditLedgerEntryDto {
  id: string;
  amount: number;
  balanceAfter: number;
  reason: string;
  reasonMetadata: Record<string, unknown> | null;
  createdAt: string;
}

/** Respuesta de `POST /gamification/activity` — qué pasó con la racha al registrar la acción. */
export interface RecordActivityResult {
  currentStreak: number;
  longestStreak: number;
  milestoneReached: number | null;
  creditsAwarded: number;
}
