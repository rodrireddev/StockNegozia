export type AdPlatform = "android" | "ios" | "desktop";

/** Fila de `GET /admin/ad-placements` — panel admin (doc §7/§1bis). */
export interface AdPlacementDto {
  id: string;
  key: string;
  platform: AdPlatform;
  adNetwork: string;
  adUnitId: string;
  enabled: boolean;
  updatedAt: string;
  updatedByAdminEmail: string | null;
}

/** Historial de un placement — `GET /admin/ad-placements/:key/:platform/revisions`. */
export interface AdPlacementRevisionDto {
  id: string;
  previousAdNetwork: string;
  newAdNetwork: string;
  previousAdUnitId: string;
  newAdUnitId: string;
  previousEnabled: boolean;
  newEnabled: boolean;
  note: string | null;
  changedByAdminEmail: string;
  changedAt: string;
}

/**
 * Respuesta de `GET /ads/placements/:key` (cliente) — solo lo que el cliente necesita para pedir
 * el anuncio, nunca metadata de admin. `null` si no hay placement o está deshabilitado (kill
 * switch, doc §1bis) — el cliente decide su propio fallback (ver `useRewardedAd`).
 */
export interface ActiveAdPlacementDto {
  adNetwork: string;
  adUnitId: string;
}
