import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { adminUsers } from "./admin-users";
import { activityMetricTypeEnum } from "./activity-events";

export const achievementCategoryEnum = pgEnum("achievement_category", [
  "setup_quest",
  "streak_milestone",
  "scheduled_goal",
]);

/**
 * `once` (setup quests, se reclama una sola vez en la vida) / `streak` (hitos de racha, el
 * `target` es el día de racha) / `daily`|`weekly`|`monthly` (objetivo del día/semana/mes calendario
 * vigente) / `specific_date` (un único día puntual, ver `scheduleConfig`).
 */
export const achievementScheduleTypeEnum = pgEnum("achievement_schedule_type", [
  "once",
  "streak",
  "daily",
  "weekly",
  "monthly",
  "specific_date",
]);

/**
 * Catálogo editable de logros (panel admin) — reemplaza los catálogos hardcodeados que existían
 * antes (`SETUP_QUEST_LABELS`/`STREAK_MILESTONE_LABELS`/`MISSION_CATALOG`, ver
 * docs/monetization/ADS_CREDITS_GAMIFICATION.md, sección "Logros"). Puede haber cualquier cantidad
 * de `scheduled_goal` activos al mismo tiempo (ej. uno diario y uno semanal, simultáneos) — a
 * diferencia del viejo sistema de "misión diaria" que rotaba de a una.
 *
 * `key`/`category`/`metricType` son inmutables después de creado (sin endpoint que los edite) —
 * cambiar la identidad de un logro a mitad de camino confundiría el historial de
 * `achievement_claims` ya generado; si hace falta, se desactiva este y se crea uno nuevo.
 *
 * Límite honesto: el panel puede crear libremente cualquier `scheduled_goal` (con una métrica ya
 * whitelisteada, ver `activity-events.ts`) y cualquier `streak_milestone` (cualquier día N) sin
 * tocar código — pero NO puede inventar un `setup_quest` nuevo, esos siguen atados a un call site
 * exacto en `mobile-mini` (`fireSetupQuestClaim("first_product")`, etc.); el panel solo edita
 * label/descripción/créditos/activo de los que ya existen.
 */
export const achievementDefinitions = pgTable("achievement_definitions", {
  id: uuid("id").primaryKey(),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  description: text("description"),
  category: achievementCategoryEnum("category").notNull(),
  // Solo aplica a `category = 'scheduled_goal'`.
  metricType: activityMetricTypeEnum("metric_type"),
  // Conteo objetivo (scheduled_goal) o día de racha (streak_milestone) — null para setup_quest.
  target: integer("target"),
  scheduleType: achievementScheduleTypeEnum("schedule_type").notNull(),
  // Solo aplica a `scheduleType = 'specific_date'`: `{ "date": "YYYY-MM-DD" }`.
  scheduleConfig: jsonb("schedule_config").$type<{ date: string }>(),
  creditsAwarded: integer("credits_awarded").notNull(),
  // "Borrar" desde el panel = false (borrado suave) — nunca DELETE real, para no romper el
  // historial de `achievement_claims`/`credit_ledger` que ya se generó con este logro.
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date" }).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull(),
  updatedByAdminId: uuid("updated_by_admin_id").references(() => adminUsers.id),
});
