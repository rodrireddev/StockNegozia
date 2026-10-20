import type { TrackableMetricType } from "../gamification/trackable-metrics";

export type AchievementDefinitionCategory = "setup_quest" | "streak_milestone" | "scheduled_goal";

export type AchievementScheduleType =
  "once" | "streak" | "daily" | "weekly" | "monthly" | "specific_date";

/** Solo se usa cuando `scheduleType === "specific_date"`. */
export interface AchievementScheduleConfig {
  date: string;
}

/** Fila de `GET /admin/achievements` — el catálogo completo, editable desde el panel. */
export interface AchievementDefinitionDto {
  id: string;
  key: string;
  label: string;
  description: string | null;
  category: AchievementDefinitionCategory;
  metricType: TrackableMetricType | null;
  target: number | null;
  scheduleType: AchievementScheduleType;
  scheduleConfig: AchievementScheduleConfig | null;
  creditsAwarded: number;
  active: boolean;
  updatedAt: string;
  updatedByAdminEmail: string | null;
}

/** Historial de un logro — `GET /admin/achievements/:key/revisions`. */
export interface AchievementDefinitionRevisionDto {
  id: string;
  previousLabel: string;
  newLabel: string;
  previousDescription: string | null;
  newDescription: string | null;
  previousTarget: number | null;
  newTarget: number | null;
  previousScheduleType: AchievementScheduleType;
  newScheduleType: AchievementScheduleType;
  previousScheduleConfig: AchievementScheduleConfig | null;
  newScheduleConfig: AchievementScheduleConfig | null;
  previousCreditsAwarded: number;
  newCreditsAwarded: number;
  previousActive: boolean;
  newActive: boolean;
  note: string | null;
  changedByAdminEmail: string;
  changedAt: string;
}
