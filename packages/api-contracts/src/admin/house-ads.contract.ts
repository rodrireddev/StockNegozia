/** Fila de `GET /admin/house-ads` — panel admin (doc §7/§1bis). */
export interface HouseAdDto {
  id: string;
  title: string;
  body: string | null;
  imageUrl: string | null;
  ctaLabel: string;
  ctaUrl: string;
  enabled: boolean;
  priority: number;
  impressionCount: number;
  updatedAt: string;
  updatedByAdminEmail: string | null;
}

/**
 * Respuesta de `GET /ads/house-ad/active` (cliente) — solo lo necesario para mostrarlo, nunca
 * metadata de admin. `null` si no hay ninguno activo.
 */
export interface ActiveHouseAdDto {
  id: string;
  title: string;
  body: string | null;
  imageUrl: string | null;
  ctaLabel: string;
  ctaUrl: string;
}
