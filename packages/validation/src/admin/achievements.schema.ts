import { TRACKABLE_METRIC_KEYS, type TrackableMetricType } from "@stocknegozia/api-contracts";
import { z } from "zod";

export const achievementCategorySchema = z.enum(["setup_quest", "streak_milestone", "scheduled_goal"]);
export const achievementScheduleTypeSchema = z.enum(["once", "streak", "daily", "weekly", "monthly", "specific_date"]);
export const trackableMetricTypeSchema = z.enum(
  TRACKABLE_METRIC_KEYS as [TrackableMetricType, ...TrackableMetricType[]],
);

const scheduleConfigSchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

/**
 * Body de `POST /admin/achievements`. `metricType`/`target`/`scheduleConfig` solo tienen sentido
 * para `scheduled_goal` (validado a mano en el service, no acá — zod no expresa bien "requerido
 * solo si category === X" sin perder los mensajes de error claros por campo).
 */
export const createAchievementSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9._-]+$/, "Solo minúsculas, números, punto, guion y guion bajo"),
  label: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  category: achievementCategorySchema,
  metricType: trackableMetricTypeSchema.optional(),
  target: z.number().int().positive().optional(),
  scheduleType: achievementScheduleTypeSchema,
  scheduleConfig: scheduleConfigSchema.optional(),
  creditsAwarded: z.number().int().min(0),
  active: z.boolean().optional().default(true),
});

export type CreateAchievementInput = z.infer<typeof createAchievementSchema>;

/**
 * Body de `PATCH /admin/achievements/:key` — `key`/`category`/`metricType` son inmutables (ver
 * comentario en el schema de Postgres): no están acá a propósito, no porque se hayan olvidado.
 */
export const updateAchievementSchema = z
  .object({
    label: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    target: z.number().int().positive().nullable().optional(),
    scheduleType: achievementScheduleTypeSchema.optional(),
    scheduleConfig: scheduleConfigSchema.nullable().optional(),
    creditsAwarded: z.number().int().min(0).optional(),
    active: z.boolean().optional(),
    note: z.string().trim().max(500).optional(),
  })
  .refine((data) => Object.keys(data).filter((key) => key !== "note").length > 0, {
    message: "Hay que mandar al menos un campo",
  });

export type UpdateAchievementInput = z.infer<typeof updateAchievementSchema>;
