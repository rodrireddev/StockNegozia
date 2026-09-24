import { z } from "zod";

/** Body de `POST /admin/house-ads`. */
export const createHouseAdSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().max(500).optional(),
  imageUrl: z.string().trim().url().optional(),
  ctaLabel: z.string().trim().min(1).max(40),
  ctaUrl: z.string().trim().url(),
  enabled: z.boolean().optional().default(true),
  priority: z.number().int().optional().default(0),
});

export type CreateHouseAdInput = z.infer<typeof createHouseAdSchema>;

/** Body de `PATCH /admin/house-ads/:id` — todo opcional, al menos un campo. */
export const updateHouseAdSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    body: z.string().trim().max(500).nullable().optional(),
    imageUrl: z.string().trim().url().nullable().optional(),
    ctaLabel: z.string().trim().min(1).max(40).optional(),
    ctaUrl: z.string().trim().url().optional(),
    enabled: z.boolean().optional(),
    priority: z.number().int().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "Hay que mandar al menos un campo" });

export type UpdateHouseAdInput = z.infer<typeof updateHouseAdSchema>;

/** Body de `POST /ads/house-ad/:id/impression` — `userId` opcional (doc: funciona sin cuenta). */
export const recordHouseAdImpressionSchema = z.object({
  userId: z.string().uuid().optional(),
});

export type RecordHouseAdImpressionInput = z.infer<typeof recordHouseAdImpressionSchema>;
