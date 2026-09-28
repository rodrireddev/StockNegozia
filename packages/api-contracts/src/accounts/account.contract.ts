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
  /** `null` = todavía no confirmó el email. Nunca bloquea nada (doc §3). */
  emailVerifiedAt: string | null;
}

/**
 * Respuesta de `POST /accounts/verify-email/resend` y `POST /accounts/password-reset/request` —
 * `devToken` solo viene fuera de producción (sin proveedor de email real todavía, ver doc
 * ADS_CREDITS_GAMIFICATION.md); permite probar el flujo completo sin leer logs del servidor.
 */
export interface DevOnlyTokenResult {
  devToken?: string;
}

export type EntitlementType = "cloud_backup" | "remove_ads";

/** Una fila de `GET /credits/me/entitlements` — `expiresAt: null` = para siempre (Cofounder). */
export interface EntitlementDto {
  type: EntitlementType;
  expiresAt: string | null;
}

/**
 * Una fila de `GET /credits/me/entitlements/catalog` — lo que necesita una pantalla de compra:
 * nombre/costo actual (leído de `credit_config_items`, nunca hardcodeado) + si ya está comprado.
 * `expiresAt: null` = no comprado todavía, o para siempre (Cofounder) — para distinguir los dos
 * casos hay que mirar si el usuario es Cofounder (`AccountMeDto.isCofounder`) aparte.
 */
export interface EntitlementCatalogItemDto {
  type: EntitlementType;
  label: string;
  description: string;
  cost: number;
  expiresAt: string | null;
}

/** Respuesta de `POST /credits/me/entitlements/:type/purchase`. */
export interface PurchaseEntitlementResult {
  type: EntitlementType;
  expiresAt: string;
  creditsSpent: number;
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

/** Un logro programado que se completó como resultado directo de este evento. */
export interface CompletedGoalResult {
  key: string;
  label: string;
  creditsAwarded: number;
}

/**
 * Respuesta de `POST /gamification/activity` — qué pasó con la racha al registrar la acción, más
 * cualquier objetivo programado (`scheduled_goal`) que se haya completado con este mismo evento
 * (se evalúa y acredita ahí mismo, sin un endpoint de "claim" separado — ver `ScheduledGoalsService`).
 */
export interface RecordActivityResult {
  currentStreak: number;
  longestStreak: number;
  milestoneReached: number | null;
  creditsAwarded: number;
  goalsCompleted: CompletedGoalResult[];
}

/** Respuesta de `POST /gamification/setup-quests/:questKey/claim`. */
export interface SetupQuestClaimResult {
  questKey: string;
  /** `true` si ya se había reclamado antes — no es un error, el cliente puede llamar sin saberlo. */
  alreadyClaimed: boolean;
  creditsAwarded: number;
}

/**
 * Una fila de `GET /gamification/goals/active` — un logro `scheduled_goal` vigente ahora mismo
 * (según su `scheduleType`: el día/semana/mes calendario, o la fecha específica configurada), con
 * el progreso ya calculado 100% server-side (suma de `activity_events` en el período vigente) —
 * el cliente nunca cuenta nada acá, solo muestra lo que el server ya evaluó. Puede haber más de
 * una fila activa al mismo tiempo (ej. un objetivo diario y uno semanal, simultáneos).
 */
export interface ActiveGoalDto {
  key: string;
  label: string;
  description: string | null;
  metricType: string;
  target: number;
  progress: number;
  scheduleType: string;
  periodKey: string;
  alreadyClaimed: boolean;
  creditsAwarded: number;
}

/** Respuesta de `POST /gamification/rewarded-ad/claim`. */
export interface RewardedAdClaimResult {
  granted: boolean;
  creditsAwarded: number;
  sequenceInDay?: number;
  /** Presente solo si `granted` es `false` — "daily_cap" o "cooldown". */
  reason?: string;
  /** Objetivos programados (`metricType: "rewarded_ad_viewed"`) completados con esta vista. */
  goalsCompleted: CompletedGoalResult[];
}

/**
 * Respuesta de `GET /gamification/rewarded-ad/status` — mismo cálculo de tope/cooldown que
 * `claim()`, pero de solo lectura, para que el cliente pueda deshabilitar el botón de "Ver
 * anuncio" (y mostrar la cuenta regresiva) ANTES de gastar tiempo cargando/mostrando un anuncio
 * que el backend igual va a rechazar.
 */
export interface RewardedAdStatusDto {
  eligible: boolean;
  /** Presente solo si `eligible` es `false` — "daily_cap" o "cooldown". */
  reason?: string;
  /** ISO — cuándo termina el cooldown actual. Solo presente si `reason === "cooldown"`. */
  nextEligibleAt?: string;
  /** Cuántos anuncios más puede ver hoy (0 si ya llegó al tope). */
  remainingToday: number;
}

export type AchievementCategory = "setup_quest" | "streak_milestone" | "referral" | "cofounder";

/** Una fila de `GET /accounts/me/achievements` — logro ya desbloqueado, listo para mostrar. */
export interface AchievementDto {
  key: string;
  category: AchievementCategory;
  label: string;
  unlockedAt: string;
}
