import { z } from "zod";

/** Body de `PATCH /admin/ad-placements/:key/:platform` — todos opcionales, pero al menos uno. */
export const updateAdPlacementSchema = z
  .object({
    adNetwork: z.string().trim().min(1).optional(),
    adUnitId: z.string().trim().min(1).optional(),
    enabled: z.boolean().optional(),
    note: z.string().trim().max(500).optional(),
  })
  .refine(
    (data) =>
      data.adNetwork !== undefined || data.adUnitId !== undefined || data.enabled !== undefined,
    {
      message: "Hay que mandar al menos adNetwork, adUnitId o enabled",
    },
  );

export type UpdateAdPlacementInput = z.infer<typeof updateAdPlacementSchema>;
