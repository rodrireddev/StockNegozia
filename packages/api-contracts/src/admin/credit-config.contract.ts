export type CreditConfigItemCategory = "source" | "sink";
export type CreditConfigItemUnit = "credits" | "count" | "minutes" | "days";

/** Una fila de la tabla editable del panel admin (doc §7) — un feature/costo balanceable. */
export interface CreditConfigItemDto {
  id: string;
  key: string;
  label: string;
  description: string | null;
  category: CreditConfigItemCategory;
  unit: CreditConfigItemUnit;
  value: number;
  updatedAt: string;
  updatedByAdminEmail: string | null;
}

/** Historial de un ítem — `GET /admin/credit-config/:key/revisions`. */
export interface CreditConfigItemRevisionDto {
  id: string;
  previousValue: number;
  newValue: number;
  note: string | null;
  changedByAdminEmail: string;
  changedAt: string;
}
